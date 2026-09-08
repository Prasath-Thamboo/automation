import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AdminProfession,
  AdminProfessionList,
  CreateProfession,
  TemplateContent,
  UpdateProfession,
} from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { parseContent } from "./catalog.service";

const templateInclude = {
  template: { include: { versions: { orderBy: { version: "desc" as const } } } },
};

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminProfessionList> {
    const rows = await this.prisma.profession.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: templateInclude,
    });
    return { professions: rows.map((row) => toAdminProfession(row)) };
  }

  async get(id: string): Promise<AdminProfession> {
    const row = await this.prisma.profession.findFirst({
      where: { id, deletedAt: null },
      include: templateInclude,
    });
    if (!row) throw new NotFoundException("Ce métier n'existe pas.");
    return toAdminProfession(row);
  }

  async create(dto: CreateProfession, actorUserId: string): Promise<AdminProfession> {
    try {
      const row = await this.prisma.profession.create({
        data: { ...dto, published: false, template: { create: {} } },
        include: templateInclude,
      });
      await this.audit.record({
        actorUserId,
        action: "catalog.profession.created",
        target: `profession:${row.id}`,
        metadata: { slug: row.slug },
      });
      return toAdminProfession(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UnprocessableEntityException({
          message: "Ce lien (slug) est déjà utilisé par un autre métier.",
          fields: { slug: ["déjà pris"] },
        });
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateProfession,
    actorUserId: string,
  ): Promise<AdminProfession> {
    const existing = await this.prisma.profession.findFirst({
      where: { id, deletedAt: null },
      include: templateInclude,
    });
    if (!existing) throw new NotFoundException("Ce métier n'existe pas.");

    if (dto.published === true) {
      const hasPublished = existing.template?.versions.some((v) => v.status === "published");
      if (!hasPublished) {
        throw new UnprocessableEntityException({
          message: "Publiez d'abord une version de la fiche avant de rendre le métier visible.",
        });
      }
    }

    try {
      const row = await this.prisma.profession.update({
        where: { id },
        data: dto,
        include: templateInclude,
      });
      await this.audit.record({
        actorUserId,
        action: "catalog.profession.updated",
        target: `profession:${id}`,
        metadata: { fields: Object.keys(dto) },
      });
      return toAdminProfession(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UnprocessableEntityException({
          message: "Ce lien (slug) est déjà utilisé par un autre métier.",
          fields: { slug: ["déjà pris"] },
        });
      }
      throw error;
    }
  }

  async remove(id: string, actorUserId: string): Promise<void> {
    const existing = await this.prisma.profession.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException("Ce métier n'existe pas.");
    await this.prisma.profession.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });
    await this.audit.record({
      actorUserId,
      action: "catalog.profession.deleted",
      target: `profession:${id}`,
    });
  }

  /** Enregistre le contenu de la fiche en brouillon (crée le brouillon au besoin). */
  async saveDraft(
    id: string,
    content: TemplateContent,
    actorUserId: string,
  ): Promise<AdminProfession> {
    const profession = await this.prisma.profession.findFirst({
      where: { id, deletedAt: null },
      include: templateInclude,
    });
    if (!profession?.template) throw new NotFoundException("Ce métier n'existe pas.");

    const { template } = profession;
    const draft = template.versions.find((v) => v.status === "draft");
    const jsonContent = content as unknown as Prisma.InputJsonValue;

    if (draft) {
      await this.prisma.assistantTemplateVersion.update({
        where: { id: draft.id },
        data: { content: jsonContent },
      });
    } else {
      const nextVersion = (template.versions[0]?.version ?? 0) + 1;
      await this.prisma.assistantTemplateVersion.create({
        data: {
          templateId: template.id,
          version: nextVersion,
          status: "draft",
          content: jsonContent,
        },
      });
    }

    await this.audit.record({
      actorUserId,
      action: "catalog.template.draft_saved",
      target: `profession:${id}`,
    });
    return this.get(id);
  }

  /** Publie le brouillon : archive la version publiée précédente, rend le métier visible. */
  async publish(id: string, actorUserId: string): Promise<AdminProfession> {
    const profession = await this.prisma.profession.findFirst({
      where: { id, deletedAt: null },
      include: templateInclude,
    });
    if (!profession?.template) throw new NotFoundException("Ce métier n'existe pas.");

    const draft = profession.template.versions.find((v) => v.status === "draft");
    if (!draft) {
      throw new UnprocessableEntityException({
        message: "Aucun brouillon à publier. Enregistrez d'abord la fiche.",
      });
    }

    await this.prisma.$transaction([
      this.prisma.assistantTemplateVersion.updateMany({
        where: { templateId: profession.template.id, status: "published" },
        data: { status: "archived" },
      }),
      this.prisma.assistantTemplateVersion.update({
        where: { id: draft.id },
        data: { status: "published", publishedAt: new Date() },
      }),
      this.prisma.profession.update({ where: { id }, data: { published: true } }),
    ]);

    await this.audit.record({
      actorUserId,
      action: "catalog.profession.published",
      target: `profession:${id}`,
      metadata: { version: draft.version },
    });
    return this.get(id);
  }
}

type ProfessionRow = Prisma.ProfessionGetPayload<{ include: typeof templateInclude }>;

function toAdminProfession(row: ProfessionRow): AdminProfession {
  const versions = row.template?.versions ?? [];
  const published = versions.find((v) => v.status === "published");
  const draft = versions.find((v) => v.status === "draft");
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sector: row.sector,
    benefit: row.benefit,
    needs: row.needs,
    monthlyPriceEur: row.monthlyPriceEur,
    setupPriceEur: row.setupPriceEur,
    trialDays: row.trialDays,
    position: row.position,
    published: row.published,
    hasDraft: Boolean(draft),
    publishedVersion: published?.version ?? null,
    draftContent: draft ? parseContent(draft.content) : null,
    publishedContent: published ? parseContent(published.content) : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
