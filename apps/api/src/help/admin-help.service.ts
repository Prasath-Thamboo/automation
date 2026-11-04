import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminHelpArticle,
  AdminHelpArticleList,
  AdminHelpRequest,
  AdminHelpRequestList,
  CreateHelpArticle,
  HelpRequestStatus,
  UpdateHelpArticle,
} from "@tando/types";
import type { HelpArticle, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queue/queue.module";
import { PushService } from "../notifications/push.service";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { helpAnsweredEmail } from "./help-mail.templates";

const REQUESTS_SHOWN = 200;

/**
 * Back-office de l'aide (Lot 15) : la base de réponses (CRUD, sans
 * redéploiement) et les questions des clients — celles restées sans réponse
 * nourrissent la base, celles transmises attendent une réponse de l'équipe.
 * Lecture transverse assumée, gardée par `AdminGuard` (comme les autres `admin-*`).
 */
@Injectable()
export class AdminHelpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly push: PushService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ── Base de réponses ────────────────────────────────────────────────────

  async listArticles(): Promise<AdminHelpArticleList> {
    const [articles, served, unhelpful] = await Promise.all([
      this.prisma.helpArticle.findMany({ orderBy: [{ position: "asc" }, { question: "asc" }] }),
      this.prisma.helpRequest.groupBy({
        by: ["articleId"],
        where: { articleId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.helpRequest.groupBy({
        by: ["articleId"],
        where: { articleId: { not: null }, helpful: false },
        _count: { _all: true },
      }),
    ]);
    const count = (rows: typeof served, id: string) =>
      rows.find((r) => r.articleId === id)?._count._all ?? 0;
    return {
      articles: articles.map((a) => ({
        ...toArticleDto(a),
        servedCount: count(served, a.id),
        unhelpfulCount: count(unhelpful, a.id),
      })),
    };
  }

  async createArticle(dto: CreateHelpArticle, actorUserId: string): Promise<AdminHelpArticle> {
    const exists = await this.prisma.helpArticle.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException(`Une réponse « ${dto.slug} » existe déjà.`);
    const article = await this.prisma.helpArticle.create({ data: dto });
    await this.audit.record({
      actorUserId,
      action: "admin.help_article_created",
      target: `help_article:${article.id}`,
      metadata: { slug: article.slug },
    });
    return { ...toArticleDto(article), servedCount: 0, unhelpfulCount: 0 };
  }

  async updateArticle(
    id: string,
    dto: UpdateHelpArticle,
    actorUserId: string,
  ): Promise<{ ok: true }> {
    await this.mustExist(id);
    const data: Prisma.HelpArticleUpdateInput = { ...dto };
    const article = await this.prisma.helpArticle.update({ where: { id }, data });
    await this.audit.record({
      actorUserId,
      action: "admin.help_article_updated",
      target: `help_article:${id}`,
      metadata: { slug: article.slug },
    });
    return { ok: true };
  }

  async removeArticle(id: string, actorUserId: string): Promise<{ ok: true }> {
    const article = await this.mustExist(id);
    // Les questions qui y renvoyaient gardent leur texte (articleId → null).
    await this.prisma.helpArticle.delete({ where: { id } });
    await this.audit.record({
      actorUserId,
      action: "admin.help_article_deleted",
      target: `help_article:${id}`,
      metadata: { slug: article.slug },
    });
    return { ok: true };
  }

  // ── Questions des clients ───────────────────────────────────────────────

  async listRequests(status?: HelpRequestStatus): Promise<AdminHelpRequestList> {
    const requests = await this.prisma.helpRequest.findMany({
      where: status ? { status } : {},
      include: { article: { select: { id: true, question: true } } },
      orderBy: { createdAt: "desc" },
      take: REQUESTS_SHOWN,
    });
    const [orgs, users] = await Promise.all([
      this.prisma.organization.findMany({
        where: { id: { in: [...new Set(requests.map((r) => r.organizationId))] } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: [...new Set(requests.map((r) => r.userId))] } },
        select: { id: true, email: true },
      }),
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const email = new Map(users.map((u) => [u.id, u.email]));

    return {
      requests: requests.map(
        (r): AdminHelpRequest => ({
          id: r.id,
          organization: { id: r.organizationId, name: orgName.get(r.organizationId) ?? "—" },
          userEmail: email.get(r.userId) ?? null,
          question: r.question,
          status: r.status,
          article: r.article,
          helpful: r.helpful,
          staffAnswer: r.staffAnswer,
          createdAt: r.createdAt.toISOString(),
          transmittedAt: r.transmittedAt?.toISOString() ?? null,
          answeredAt: r.answeredAt?.toISOString() ?? null,
        }),
      ),
    };
  }

  /** L'équipe Tando répond : visible dans l'espace du client, email + notification. */
  async answer(id: string, answer: string, actorUserId: string): Promise<{ ok: true }> {
    const request = await this.prisma.helpRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException("Cette question n'existe pas.");

    await this.prisma.helpRequest.update({
      where: { id },
      data: { status: "traitee", staffAnswer: answer, answeredAt: new Date() },
    });

    const asker = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { email: true, deletedAt: true },
    });
    if (asker && !asker.deletedAt) {
      await this.queue.enqueueEmail(
        helpAnsweredEmail(asker.email, {
          question: request.question,
          answer,
          link: `${webBaseUrl(this.env)}/mon-equipe/aide`,
        }),
      );
      await this.push.notifyHelpAnswered({ userId: request.userId, question: request.question });
    }

    await this.audit.record({
      organizationId: request.organizationId,
      actorUserId,
      action: "admin.help_request_answered",
      target: `help_request:${id}`,
    });
    return { ok: true };
  }

  private async mustExist(id: string): Promise<HelpArticle> {
    const article = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("Cette réponse n'existe pas.");
    return article;
  }
}

function toArticleDto(a: HelpArticle): Omit<AdminHelpArticle, "servedCount" | "unhelpfulCount"> {
  return {
    id: a.id,
    slug: a.slug,
    question: a.question,
    keywords: a.keywords,
    answer: a.answer,
    action: a.action,
    published: a.published,
    position: a.position,
  };
}
