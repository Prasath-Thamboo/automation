import { z } from "zod";

/**
 * Lot 15 — aide au patron (« Une question ? »). Le patron pose une question sur
 * son compte, ses factures, son employé… ; l'API cherche la réponse dans une
 * base écrite par l'équipe Velekya. Sans réponse fiable, rien n'est inventé : la
 * question peut être transmise à l'équipe, qui répond depuis le back-office.
 */

export const HELP_ACTIONS = ["aucune", "equipe", "documents", "compte", "reglages", "carnet"] as const;
export type HelpAction = (typeof HELP_ACTIONS)[number];

export const HELP_REQUEST_STATUSES = ["repondue", "sans_reponse", "transmise", "traitee"] as const;
export type HelpRequestStatus = (typeof HELP_REQUEST_STATUSES)[number];

/** Une question de la base, telle que proposée au patron. */
export interface HelpTopic {
  id: string;
  question: string;
}

/** Une réponse de la base. */
export interface HelpArticleAnswer extends HelpTopic {
  answer: string;
  action: HelpAction;
}

/** Une question déjà posée par l'organisation (historique). */
export interface HelpRequestItem {
  id: string;
  question: string;
  status: HelpRequestStatus;
  /** Réponse de la base, ou réponse de l'équipe Velekya. */
  answer: string | null;
  action: HelpAction;
  helpful: boolean | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface HelpHome {
  topics: HelpTopic[];
  history: HelpRequestItem[];
}

/** Résultat d'une question posée. */
export interface HelpReply {
  request: HelpRequestItem;
  /** Autres questions proches (« Vous cherchez peut-être… »). */
  suggestions: HelpTopic[];
}

const topicSchema: z.ZodType<HelpTopic> = z.object({ id: z.string().uuid(), question: z.string() });

export const helpRequestItemSchema: z.ZodType<HelpRequestItem> = z.object({
  id: z.string().uuid(),
  question: z.string(),
  status: z.enum(HELP_REQUEST_STATUSES),
  answer: z.string().nullable(),
  action: z.enum(HELP_ACTIONS),
  helpful: z.boolean().nullable(),
  createdAt: z.string(),
  answeredAt: z.string().nullable(),
});

export const helpHomeSchema: z.ZodType<HelpHome> = z.object({
  topics: z.array(topicSchema),
  history: z.array(helpRequestItemSchema),
});

export const helpReplySchema: z.ZodType<HelpReply> = z.object({
  request: helpRequestItemSchema,
  suggestions: z.array(topicSchema),
});

export const askHelpSchema = z.object({
  question: z.string().trim().min(3, "Écrivez votre question en quelques mots.").max(500),
  /** Le patron a choisi une question proposée : on donne directement sa réponse. */
  articleId: z.string().uuid().optional(),
});
export type AskHelp = z.infer<typeof askHelpSchema>;

export const helpFeedbackSchema = z.object({ helpful: z.boolean() });
export type HelpFeedback = z.infer<typeof helpFeedbackSchema>;

// ── Back-office ─────────────────────────────────────────────────────────────

export interface AdminHelpArticle extends HelpArticleAnswer {
  slug: string;
  keywords: string[];
  published: boolean;
  position: number;
  /** Nombre de fois où cette réponse a été donnée / jugée inutile. */
  servedCount: number;
  unhelpfulCount: number;
}

export interface AdminHelpRequest {
  id: string;
  organization: { id: string; name: string };
  userEmail: string | null;
  question: string;
  status: HelpRequestStatus;
  article: HelpTopic | null;
  helpful: boolean | null;
  staffAnswer: string | null;
  createdAt: string;
  transmittedAt: string | null;
  answeredAt: string | null;
}

export const adminHelpArticleSchema: z.ZodType<AdminHelpArticle> = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  question: z.string(),
  keywords: z.array(z.string()),
  answer: z.string(),
  action: z.enum(HELP_ACTIONS),
  published: z.boolean(),
  position: z.number().int(),
  servedCount: z.number().int(),
  unhelpfulCount: z.number().int(),
});

export const adminHelpArticleListSchema = z.object({ articles: z.array(adminHelpArticleSchema) });
export type AdminHelpArticleList = { articles: AdminHelpArticle[] };

export const adminHelpRequestSchema: z.ZodType<AdminHelpRequest> = z.object({
  id: z.string().uuid(),
  organization: z.object({ id: z.string().uuid(), name: z.string() }),
  userEmail: z.string().nullable(),
  question: z.string(),
  status: z.enum(HELP_REQUEST_STATUSES),
  article: topicSchema.nullable(),
  helpful: z.boolean().nullable(),
  staffAnswer: z.string().nullable(),
  createdAt: z.string(),
  transmittedAt: z.string().nullable(),
  answeredAt: z.string().nullable(),
});

export const adminHelpRequestListSchema = z.object({ requests: z.array(adminHelpRequestSchema) });
export type AdminHelpRequestList = { requests: AdminHelpRequest[] };

const keywords = z
  .array(z.string().trim().min(2).max(60))
  .max(30)
  .transform((list) => [...new Set(list.map((k) => k.toLowerCase()))]);

export const createHelpArticleSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,59}$/, "Identifiant : 2 à 60 caractères, minuscules, chiffres ou tirets."),
  question: z.string().trim().min(5).max(160),
  keywords: keywords.default([]),
  answer: z.string().trim().min(5).max(2000),
  action: z.enum(HELP_ACTIONS).default("aucune"),
  published: z.boolean().default(true),
  position: z.number().int().min(0).max(999).default(0),
});
export type CreateHelpArticle = z.infer<typeof createHelpArticleSchema>;

export const updateHelpArticleSchema = z
  .object({
    question: z.string().trim().min(5).max(160),
    keywords,
    answer: z.string().trim().min(5).max(2000),
    action: z.enum(HELP_ACTIONS),
    published: z.boolean(),
    position: z.number().int().min(0).max(999),
  })
  .partial();
export type UpdateHelpArticle = z.infer<typeof updateHelpArticleSchema>;

export const answerHelpRequestSchema = z.object({
  answer: z.string().trim().min(5, "Réponse trop courte.").max(2000),
});
export type AnswerHelpRequest = z.infer<typeof answerHelpRequestSchema>;
