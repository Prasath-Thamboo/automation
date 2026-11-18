import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AskHelp,
  HelpHome,
  HelpReply,
  HelpRequestItem,
  HelpTopic,
  SessionUser,
} from "@velekya/types";
import type { HelpArticle, HelpRequest } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queue/queue.module";
import { MailService } from "../mail/mail.service";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { matchHelp } from "./help-matcher";
import { helpTransmittedEmail } from "./help-mail.templates";

const TOPICS_SHOWN = 8;
const HISTORY_SHOWN = 20;

type RequestWithArticle = HelpRequest & { article: HelpArticle | null };

export function toHelpItem(r: RequestWithArticle): HelpRequestItem {
  const answer = r.status === "traitee" ? r.staffAnswer : (r.article?.answer ?? null);
  return {
    id: r.id,
    question: r.question,
    status: r.status,
    answer,
    action: r.status === "traitee" ? "aucune" : (r.article?.action ?? "aucune"),
    helpful: r.helpful,
    createdAt: r.createdAt.toISOString(),
    answeredAt: r.answeredAt?.toISOString() ?? null,
  };
}

const topic = (a: HelpArticle): HelpTopic => ({ id: a.id, question: a.question });

/**
 * Lot 15 — « Une question ? » : l'aide au patron dans son espace (web + mobile).
 * Réponses écrites à l'avance (`help_articles`), recherche par mots
 * (`help-matcher`), aucune réponse inventée. Sans réponse sûre, le patron peut
 * transmettre sa question à l'équipe Velekya (email + back-office).
 */
@Injectable()
export class HelpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async home(user: SessionUser): Promise<HelpHome> {
    const [articles, history] = await Promise.all([
      this.prisma.helpArticle.findMany({
        where: { published: true },
        orderBy: [{ position: "asc" }, { question: "asc" }],
        take: TOPICS_SHOWN,
      }),
      this.prisma.helpRequest.findMany({
        where: { organizationId: user.organizationId },
        include: { article: true },
        orderBy: { createdAt: "desc" },
        take: HISTORY_SHOWN,
      }),
    ]);
    return { topics: articles.map(topic), history: history.map(toHelpItem) };
  }

  async ask(user: SessionUser, dto: AskHelp): Promise<HelpReply> {
    const articles = await this.prisma.helpArticle.findMany({
      where: { published: true },
      orderBy: { position: "asc" },
    });

    const chosen = dto.articleId ? articles.find((a) => a.id === dto.articleId) : undefined;
    const { best, suggestions } = chosen
      ? { best: chosen, suggestions: [] }
      : matchHelp(dto.question, articles);

    const request = await this.prisma.helpRequest.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        question: dto.question,
        articleId: best?.id ?? null,
        status: best ? "repondue" : "sans_reponse",
      },
      include: { article: true },
    });
    return { request: toHelpItem(request), suggestions: suggestions.map(topic) };
  }

  async feedback(user: SessionUser, id: string, helpful: boolean): Promise<HelpRequestItem> {
    await this.mustOwn(user, id);
    const updated = await this.prisma.helpRequest.update({
      where: { id },
      data: { helpful },
      include: { article: true },
    });
    return toHelpItem(updated);
  }

  /** Le patron transmet sa question à l'équipe Velekya. Idempotent. */
  async transmit(user: SessionUser, id: string): Promise<HelpRequestItem> {
    const current = await this.mustOwn(user, id);
    if (current.status === "transmise" || current.status === "traitee") return toHelpItem(current);

    const updated = await this.prisma.helpRequest.update({
      where: { id },
      data: { status: "transmise", transmittedAt: new Date() },
      include: { article: true },
    });
    await this.queue.enqueueEmail(
      helpTransmittedEmail(this.env.HELP_DESK_EMAIL ?? this.mail.defaultAddress, {
        organizationName: user.organizationName,
        askedBy: user.email,
        question: updated.question,
        adminUrl: `${webBaseUrl(this.env)}/admin/aide`,
      }),
    );
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "help.transmitted",
      target: `help_request:${id}`,
    });
    return toHelpItem(updated);
  }

  private async mustOwn(user: SessionUser, id: string): Promise<RequestWithArticle> {
    const request = await this.prisma.helpRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { article: true },
    });
    if (!request) throw new NotFoundException("Cette question est introuvable. Posez-la à nouveau.");
    return request;
  }
}
