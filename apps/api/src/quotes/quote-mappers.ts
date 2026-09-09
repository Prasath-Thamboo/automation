import { Prisma } from "@prisma/client";
import type {
  AdminQuote,
  AdminQuoteListItem,
  AssessmentAnswers,
  PublicQuote,
  QuoteContent,
  QuoteLine,
  QuoteStatus,
} from "@tando/types";

export const quoteWithRelations = {
  include: {
    needsAssessment: true,
    lineItems: { orderBy: { position: "asc" as const } },
    acceptance: true,
  },
};

export type QuoteRow = Prisma.QuoteGetPayload<typeof quoteWithRelations>;

const toEur = (cents: number): number => Math.round(cents) / 100;
const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

function lines(row: QuoteRow): QuoteLine[] {
  return row.lineItems.map((l) => ({
    kind: l.kind,
    label: l.label,
    setupEur: toEur(l.setupCents),
    monthlyEur: toEur(l.monthlyCents),
  }));
}

function content(row: QuoteRow): QuoteContent {
  return row.content as unknown as QuoteContent;
}

export function toPublicQuote(row: QuoteRow): PublicQuote {
  return {
    number: row.number,
    status: row.status as QuoteStatus,
    formula: row.formula,
    setupEur: toEur(row.setupCents),
    monthlyEur: toEur(row.monthlyCents),
    engagementMonths: row.engagementMonths,
    serviceDelayDays: row.serviceDelayDays,
    expiresAt: iso(row.expiresAt),
    lines: lines(row),
    content: content(row),
    decided: Boolean(row.decidedAt),
    acceptedAt: iso(row.acceptance?.acceptedAt ?? null),
  };
}

export function toAdminListItem(row: QuoteRow): AdminQuoteListItem {
  const c = content(row);
  return {
    id: row.id,
    number: row.number,
    status: row.status as QuoteStatus,
    company: c.company,
    contactName: c.contactName,
    email: row.needsAssessment.email,
    setupEur: toEur(row.setupCents),
    monthlyEur: toEur(row.monthlyCents),
    createdAt: row.createdAt.toISOString(),
    sentAt: iso(row.sentAt),
  };
}

export function toAdminQuote(row: QuoteRow): AdminQuote {
  return {
    ...toAdminListItem(row),
    formula: row.formula,
    complexityFactor: row.complexityFactor,
    complexityNote: row.complexityNote,
    engagementMonths: row.engagementMonths,
    serviceDelayDays: row.serviceDelayDays,
    expiresAt: iso(row.expiresAt),
    lines: lines(row),
    content: content(row),
    answers: (row.needsAssessment.answers as AssessmentAnswers) ?? {},
    acceptedAt: iso(row.acceptance?.acceptedAt ?? null),
    acceptanceIp: row.acceptance?.ip ?? null,
  };
}
