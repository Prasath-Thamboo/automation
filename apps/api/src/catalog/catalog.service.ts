import { Injectable, NotFoundException } from "@nestjs/common";
import {
  templateContentSchema,
  type CatalogList,
  type ProfessionCard,
  type ProfessionDetail,
  type TemplateContent,
} from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";

/** Lecture du catalogue public (§5). Ne renvoie que les métiers publiés
 *  ayant une version de fiche publiée. */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CatalogList> {
    const rows = await this.prisma.profession.findMany({
      where: {
        published: true,
        deletedAt: null,
        template: { versions: { some: { status: "published" } } },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        template: {
          include: { versions: { where: { status: "published" }, take: 1 } },
        },
      },
    });

    const professions: ProfessionCard[] = rows.map((row) => {
      const content = parseContent(row.template?.versions[0]?.content);
      return {
        slug: row.slug,
        name: row.name,
        sector: row.sector,
        benefit: row.benefit,
        needs: row.needs,
        assistantName: content?.assistantName ?? "",
        monthlyPriceEur: row.monthlyPriceEur,
        trialDays: row.trialDays,
      };
    });

    return {
      professions,
      sectors: [...new Set(professions.map((p) => p.sector))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
      needs: [...new Set(professions.flatMap((p) => p.needs))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    };
  }

  async detail(slug: string): Promise<ProfessionDetail> {
    const row = await this.prisma.profession.findFirst({
      where: { slug, published: true, deletedAt: null },
      include: {
        template: {
          include: { versions: { where: { status: "published" }, take: 1 } },
        },
      },
    });

    const content = parseContent(row?.template?.versions[0]?.content);
    if (!row || !content) {
      throw new NotFoundException("Cette fiche n'existe pas ou n'est pas encore publiée.");
    }

    return {
      slug: row.slug,
      name: row.name,
      sector: row.sector,
      benefit: row.benefit,
      needs: row.needs,
      assistantName: content.assistantName,
      monthlyPriceEur: row.monthlyPriceEur,
      setupPriceEur: row.setupPriceEur,
      trialDays: row.trialDays,
      content,
    };
  }

}

/** Valide le contenu JSON stocké ; renvoie `null` s'il est absent ou corrompu. */
export function parseContent(value: unknown): TemplateContent | null {
  if (value == null) return null;
  const parsed = templateContentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
