import { z } from "zod";

/**
 * Employé virtuel sur mesure (§4) : questionnaire de besoin → fiche de poste en
 * langage clair → devis → acceptation horodatée → mission.
 *
 * Comme pour le catalogue : interfaces écrites à la main, schémas Zod annotés
 * `z.ZodType<...>` pour les structures imbriquées.
 */

// ── Questionnaire ───────────────────────────────────────────────────────────

/** Réponses au questionnaire, remplies progressivement — tout est optionnel. */
export type AssessmentAnswers = Record<string, string | string[] | undefined>;

export interface AssessmentState {
  id: string;
  email: string;
  currentStep: number;
  answers: AssessmentAnswers;
  completed: boolean;
  jobDescription: JobDescriptionContent | null;
  /** Numéro du devis une fois la demande envoyée. */
  quoteNumber: string | null;
}

export const startAssessmentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type StartAssessment = z.infer<typeof startAssessmentSchema>;

export const answerValueSchema = z.union([z.string(), z.array(z.string())]);
const answersRecordSchema = z.record(
  z.string(),
  answerValueSchema.optional(),
) as z.ZodType<AssessmentAnswers>;

export const patchAssessmentSchema = z.object({
  answers: z.record(z.string(), answerValueSchema),
  currentStep: z.number().int().min(0).max(50).optional(),
});
export type PatchAssessment = z.infer<typeof patchAssessmentSchema>;

// ── Fiche de poste ─────────────────────────────────────────────────────────

export interface JobDescriptionContent {
  summary: string;
  tasks: string[];
  channels: string[];
  hours: string;
  limits: string[];
  tone: string;
  tools: string[];
  outOfScope: string[];
}

export const jobDescriptionContentSchema: z.ZodType<JobDescriptionContent> = z.object({
  summary: z.string().trim().min(1).max(2000),
  tasks: z.array(z.string().trim().min(1).max(300)).max(20),
  channels: z.array(z.string().trim().min(1).max(120)).max(10),
  hours: z.string().trim().min(1).max(200),
  limits: z.array(z.string().trim().min(1).max(300)).max(20),
  tone: z.string().trim().min(1).max(200),
  tools: z.array(z.string().trim().min(1).max(200)).max(15),
  outOfScope: z.array(z.string().trim().min(1).max(300)).max(20),
});

/** Envoi final : fige la fiche de poste (éventuellement corrigée) et déclenche
 *  la génération du devis en brouillon. */
export const submitAssessmentSchema = z.object({
  jobDescription: jobDescriptionContentSchema,
});
export type SubmitAssessment = z.infer<typeof submitAssessmentSchema>;

export const assessmentStateSchema: z.ZodType<AssessmentState> = z.object({
  id: z.string().uuid(),
  email: z.string(),
  currentStep: z.number().int(),
  answers: answersRecordSchema,
  completed: z.boolean(),
  jobDescription: jobDescriptionContentSchema.nullable(),
  quoteNumber: z.string().nullable(),
});

export const startAssessmentResultSchema = z.object({
  state: assessmentStateSchema,
  resumeToken: z.string(),
});
export type StartAssessmentResult = z.infer<typeof startAssessmentResultSchema>;

// ── Devis ──────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | "brouillon"
  | "en_relecture"
  | "envoye"
  | "vu"
  | "accepte"
  | "refuse"
  | "expire";

export interface QuoteLine {
  kind: string;
  label: string;
  setupEur: number;
  monthlyEur: number;
}

export interface QuoteContent {
  jobDescription: JobDescriptionContent;
  benefits: string[];
  outOfScope: string[];
  company: string;
  contactName: string;
}

const quoteContentSchema: z.ZodType<QuoteContent> = z.object({
  jobDescription: jobDescriptionContentSchema,
  benefits: z.array(z.string()),
  outOfScope: z.array(z.string()),
  company: z.string(),
  contactName: z.string(),
});

/** Devis vu par le client (lien magique). */
export interface PublicQuote {
  number: string;
  status: QuoteStatus;
  formula: string;
  setupEur: number;
  monthlyEur: number;
  engagementMonths: number;
  serviceDelayDays: number;
  expiresAt: string | null;
  lines: QuoteLine[];
  content: QuoteContent;
  decided: boolean;
  acceptedAt: string | null;
}

const quoteLineSchema: z.ZodType<QuoteLine> = z.object({
  kind: z.string(),
  label: z.string(),
  setupEur: z.number(),
  monthlyEur: z.number(),
});

export const publicQuoteSchema: z.ZodType<PublicQuote> = z.object({
  number: z.string(),
  status: z.enum(["brouillon", "en_relecture", "envoye", "vu", "accepte", "refuse", "expire"]),
  formula: z.string(),
  setupEur: z.number(),
  monthlyEur: z.number(),
  engagementMonths: z.number().int(),
  serviceDelayDays: z.number().int(),
  expiresAt: z.string().nullable(),
  lines: z.array(quoteLineSchema),
  content: quoteContentSchema,
  decided: z.boolean(),
  acceptedAt: z.string().nullable(),
});

export const acceptQuoteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  cgv: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les conditions générales." }) }),
});
export type AcceptQuote = z.infer<typeof acceptQuoteSchema>;

// ── Back-office devis ──────────────────────────────────────────────────────

export interface AdminQuoteListItem {
  id: string;
  number: string;
  status: QuoteStatus;
  company: string;
  contactName: string;
  email: string;
  setupEur: number;
  monthlyEur: number;
  createdAt: string;
  sentAt: string | null;
}

export interface AdminQuote extends AdminQuoteListItem {
  formula: string;
  complexityFactor: number;
  complexityNote: string | null;
  engagementMonths: number;
  serviceDelayDays: number;
  expiresAt: string | null;
  lines: QuoteLine[];
  content: QuoteContent;
  answers: AssessmentAnswers;
  acceptedAt: string | null;
  acceptanceIp: string | null;
}

export interface AdminQuoteList {
  quotes: AdminQuoteListItem[];
}

const adminQuoteListItemSchema: z.ZodType<AdminQuoteListItem> = z.object({
  id: z.string().uuid(),
  number: z.string(),
  status: z.enum(["brouillon", "en_relecture", "envoye", "vu", "accepte", "refuse", "expire"]),
  company: z.string(),
  contactName: z.string(),
  email: z.string(),
  setupEur: z.number(),
  monthlyEur: z.number(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});

export const adminQuoteListSchema: z.ZodType<AdminQuoteList> = z.object({
  quotes: z.array(adminQuoteListItemSchema),
});

export const adminQuoteSchema: z.ZodType<AdminQuote> = z.object({
  id: z.string().uuid(),
  number: z.string(),
  status: z.enum(["brouillon", "en_relecture", "envoye", "vu", "accepte", "refuse", "expire"]),
  company: z.string(),
  contactName: z.string(),
  email: z.string(),
  setupEur: z.number(),
  monthlyEur: z.number(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  formula: z.string(),
  complexityFactor: z.number(),
  complexityNote: z.string().nullable(),
  engagementMonths: z.number().int(),
  serviceDelayDays: z.number().int(),
  expiresAt: z.string().nullable(),
  lines: z.array(quoteLineSchema),
  content: quoteContentSchema,
  answers: z.record(z.string(), answerValueSchema.optional()) as z.ZodType<AssessmentAnswers>,
  acceptedAt: z.string().nullable(),
  acceptanceIp: z.string().nullable(),
});

/** Ajustements admin avant envoi (§4.2). */
export const updateQuoteSchema = z
  .object({
    complexityFactor: z.number().min(0.8).max(2),
    complexityNote: z.string().trim().max(500).optional().default(""),
    engagementMonths: z.number().int().min(0).max(60),
    serviceDelayDays: z.number().int().min(1).max(120),
    formula: z.enum(["sur-mesure", "sur-mesure-plus"]),
  })
  .refine((v) => v.complexityFactor === 1 || v.complexityNote.trim().length > 0, {
    message: "Un commentaire est obligatoire dès que le facteur de complexité n'est pas à 1.",
    path: ["complexityNote"],
  });
export type UpdateQuote = z.infer<typeof updateQuoteSchema>;
