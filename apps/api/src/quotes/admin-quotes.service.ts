import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  AdminQuote,
  AdminQuoteList,
  AssessmentAnswers,
  UpdateQuote,
} from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { PricingService } from "./pricing/pricing.service";
import { QuotesService } from "./quotes.service";
import { quoteSentEmail } from "./quote-mail.templates";
import { quoteWithRelations, toAdminListItem, toAdminQuote } from "./quote-mappers";

const DAY = 24 * 60 * 60 * 1000;
const EDITABLE = ["brouillon", "en_relecture"];

@Injectable()
export class AdminQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly quotes: QuotesService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminQuoteList> {
    const rows = await this.prisma.quote.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      ...quoteWithRelations,
    });
    return { quotes: rows.map(toAdminListItem) };
  }

  async get(id: string): Promise<AdminQuote> {
    const row = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      ...quoteWithRelations,
    });
    if (!row) throw new NotFoundException("Ce devis n'existe pas.");
    return toAdminQuote(row);
  }

  async update(id: string, dto: UpdateQuote, actorUserId: string): Promise<AdminQuote> {
    const row = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      ...quoteWithRelations,
    });
    if (!row) throw new NotFoundException("Ce devis n'existe pas.");
    if (!EDITABLE.includes(row.status)) {
      throw new UnprocessableEntityException({
        message: "Ce devis a déjà été envoyé et ne peut plus être modifié.",
      });
    }

    const answers = (row.needsAssessment.answers as AssessmentAnswers) ?? {};
    const rules = await this.pricing.loadRules();
    const pricing = this.pricing.compute(answers, dto.formula, rules, dto.complexityFactor);

    await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status: "en_relecture",
          formula: pricing.formula,
          setupCents: pricing.setupCents,
          monthlyCents: pricing.monthlyCents,
          complexityFactor: dto.complexityFactor,
          complexityNote: dto.complexityNote.trim() || null,
          engagementMonths: dto.engagementMonths,
          serviceDelayDays: dto.serviceDelayDays,
        },
      });
      await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
      await tx.quoteLineItem.createMany({
        data: pricing.lines.map((l, i) => ({
          quoteId: id,
          kind: l.kind,
          label: l.label,
          setupCents: Math.round(l.setupEur * 100),
          monthlyCents: Math.round(l.monthlyEur * 100),
          position: i,
        })),
      });
    });

    await this.audit.record({
      actorUserId,
      action: "quote.updated",
      target: `quote:${id}`,
      metadata: { complexityFactor: dto.complexityFactor, formula: pricing.formula },
    });
    return this.get(id);
  }

  /** Relecture terminée : envoi au client (§4.2 — jamais automatique). */
  async send(id: string, actorUserId: string): Promise<AdminQuote> {
    const row = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      ...quoteWithRelations,
    });
    if (!row) throw new NotFoundException("Ce devis n'existe pas.");
    if (!EDITABLE.includes(row.status)) {
      throw new UnprocessableEntityException({ message: "Ce devis a déjà été envoyé." });
    }
    if (row.complexityFactor !== 1 && !row.complexityNote) {
      throw new UnprocessableEntityException({
        message: "Ajoutez un commentaire au facteur de complexité avant d'envoyer.",
      });
    }

    const token = await this.quotes.rotateToken(row.needsAssessmentId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * DAY);

    await this.prisma.quote.update({
      where: { id },
      data: { status: "envoye", sentAt: now, expiresAt },
    });

    await this.queue.enqueueEmail(
      quoteSentEmail(row.needsAssessment.email, row.number, this.quotes.viewLink(row.number, token)),
    );
    await this.queue.enqueueQuoteJob({ type: "reminder-j7", quoteId: id }, 7 * DAY);
    await this.queue.enqueueQuoteJob({ type: "reminder-j21", quoteId: id }, 21 * DAY);
    await this.queue.enqueueQuoteJob({ type: "expire", quoteId: id }, 30 * DAY);

    await this.audit.record({
      actorUserId,
      action: "quote.sent",
      target: `quote:${id}`,
      metadata: { number: row.number },
    });
    return this.get(id);
  }
}
