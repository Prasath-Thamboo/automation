import { z } from "zod";
import type { SubscriptionSummary } from "./billing";

/**
 * Back-office (§10, Lot 10). Vocabulaire technique normal (§2) : ces écrans ne
 * sont jamais vus par le client. Types écrits à la main + schémas Zod annotés
 * `z.ZodType<...>` (comme le catalogue) pour éviter les types géants aux
 * frontières de paquets.
 */

// ── Tableau de bord d'activité ──────────────────────────────────────────────

export interface AdminDashboard {
  quotes: {
    /** Nombre de devis par statut (`brouillon`, `envoye`, `accepte`, …). */
    byStatus: Record<string, number>;
    /** accepte / (envoye + vu + accepte + refuse + expire), en %. */
    acceptanceRatePct: number;
    createdLast30d: number;
    acceptedLast30d: number;
  };
  revenue: {
    /** Somme des mensualités des abonnements actifs, en euros. */
    mrrEur: number;
    activeSubscriptions: number;
    unpaidInvoices: number;
    unpaidEur: number;
  };
  missions: { byStatus: Record<string, number> };
  assistants: { byState: Record<string, number> };
  clients: { total: number; withActiveSubscription: number; newLast30d: number };
  openEscalations: number;
}

// ── Missions ───────────────────────────────────────────────────────────────

export type MissionStatus = "a_preparer" | "en_preparation" | "en_service" | "annulee";

export interface MissionChecklistItem {
  label: string;
  done: boolean;
}

export interface AdminMissionListItem {
  id: string;
  quoteNumber: string;
  organizationName: string;
  status: MissionStatus;
  assistantId: string | null;
  assistantName: string | null;
  createdAt: string;
}

export interface AdminMissionList {
  missions: AdminMissionListItem[];
}

export interface AdminMissionDetail extends AdminMissionListItem {
  organizationId: string;
  quoteId: string;
  /** Fiche de poste en langage clair (JSON), figée à l'acceptation du devis. */
  jobDescription: unknown;
  answers: Record<string, unknown>;
  checklist: MissionChecklistItem[];
}

export const updateMissionSchema = z.object({
  status: z.enum(["a_preparer", "en_preparation", "en_service", "annulee"]).optional(),
  checklist: z
    .array(z.object({ label: z.string().trim().min(1).max(200), done: z.boolean() }))
    .max(50)
    .optional(),
});
export type UpdateMission = z.infer<typeof updateMissionSchema>;

// ── Prix (barème configurable en base) ─────────────────────────────────────

export type PricingRuleKind = "socle" | "module" | "volume" | "outil";

export interface AdminPricingRule {
  id: string;
  kind: PricingRuleKind;
  key: string;
  label: string;
  setupEur: number;
  monthlyEur: number;
  /** Modules : poids d'usage sur le mensuel. Volume : coefficient multiplicateur. */
  factor: number;
  active: boolean;
  position: number;
}

export interface AdminPricingRuleList {
  rules: AdminPricingRule[];
}

export const createPricingRuleSchema = z.object({
  kind: z.enum(["socle", "module", "volume", "outil"]),
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Clé en minuscules, chiffres et tirets."),
  label: z.string().trim().min(1).max(120),
  setupEur: z.number().min(0).max(100_000).default(0),
  monthlyEur: z.number().min(0).max(100_000).default(0),
  factor: z.number().min(0).max(10).default(1),
  active: z.boolean().default(true),
  position: z.number().int().min(0).max(999).default(0),
});
export type CreatePricingRule = z.infer<typeof createPricingRuleSchema>;

export const updatePricingRuleSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  setupEur: z.number().min(0).max(100_000).optional(),
  monthlyEur: z.number().min(0).max(100_000).optional(),
  factor: z.number().min(0).max(10).optional(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).max(999).optional(),
});
export type UpdatePricingRule = z.infer<typeof updatePricingRuleSchema>;

// ── Clients ────────────────────────────────────────────────────────────────

export interface AdminClientListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  assistantCount: number;
  subscriptionStatus: string | null;
  openEscalations: number;
}

export interface AdminClientList {
  clients: AdminClientListItem[];
}

export interface AdminClientMember {
  email: string;
  fullName: string | null;
  role: string;
}

export interface AdminClientAssistant {
  id: string;
  name: string;
  role: string;
  state: string;
  onboarding: string;
}

export interface AdminClientInvoice {
  number: string;
  status: string;
  totalEur: number;
  issuedAt: string;
}

export interface AdminClientEscalation {
  id: string;
  question: string;
  status: string;
  createdAt: string;
}

export interface AdminClientDetail extends AdminClientListItem {
  members: AdminClientMember[];
  assistants: AdminClientAssistant[];
  subscription: SubscriptionSummary | null;
  recentInvoices: AdminClientInvoice[];
  recentEscalations: AdminClientEscalation[];
}

// ── Schémas de réponse (validation côté client API) ────────────────────────

const countMap = z.record(z.string(), z.number());

export const adminDashboardSchema: z.ZodType<AdminDashboard> = z.object({
  quotes: z.object({
    byStatus: countMap,
    acceptanceRatePct: z.number(),
    createdLast30d: z.number(),
    acceptedLast30d: z.number(),
  }),
  revenue: z.object({
    mrrEur: z.number(),
    activeSubscriptions: z.number(),
    unpaidInvoices: z.number(),
    unpaidEur: z.number(),
  }),
  missions: z.object({ byStatus: countMap }),
  assistants: z.object({ byState: countMap }),
  clients: z.object({
    total: z.number(),
    withActiveSubscription: z.number(),
    newLast30d: z.number(),
  }),
  openEscalations: z.number(),
});

const missionStatusEnum = z.enum(["a_preparer", "en_preparation", "en_service", "annulee"]);

const adminMissionListItemSchema: z.ZodType<AdminMissionListItem> = z.object({
  id: z.string().uuid(),
  quoteNumber: z.string(),
  organizationName: z.string(),
  status: missionStatusEnum,
  assistantId: z.string().uuid().nullable(),
  assistantName: z.string().nullable(),
  createdAt: z.string(),
});

export const adminMissionListSchema: z.ZodType<AdminMissionList> = z.object({
  missions: z.array(adminMissionListItemSchema),
});

export const adminMissionDetailSchema = z.object({
  id: z.string().uuid(),
  quoteNumber: z.string(),
  organizationName: z.string(),
  status: missionStatusEnum,
  assistantId: z.string().uuid().nullable(),
  assistantName: z.string().nullable(),
  createdAt: z.string(),
  organizationId: z.string().uuid(),
  quoteId: z.string().uuid(),
  jobDescription: z.unknown(),
  answers: z.record(z.string(), z.unknown()),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })),
}) as unknown as z.ZodType<AdminMissionDetail>;

const pricingKindEnum = z.enum(["socle", "module", "volume", "outil"]);

const adminPricingRuleSchema: z.ZodType<AdminPricingRule> = z.object({
  id: z.string().uuid(),
  kind: pricingKindEnum,
  key: z.string(),
  label: z.string(),
  setupEur: z.number(),
  monthlyEur: z.number(),
  factor: z.number(),
  active: z.boolean(),
  position: z.number(),
});

export const adminPricingRuleListSchema: z.ZodType<AdminPricingRuleList> = z.object({
  rules: z.array(adminPricingRuleSchema),
});

export { adminPricingRuleSchema };

const subSummarySchemaRef: z.ZodType<SubscriptionSummary> = z.object({
  status: z.enum(["incomplete", "active", "past_due", "paused", "canceled"]),
  formula: z.string(),
  currency: z.string(),
  monthlyEur: z.number(),
  setupEur: z.number(),
  currentPeriodEnd: z.string().nullable(),
  canceledAt: z.string().nullable(),
});

const adminClientListItemSchema: z.ZodType<AdminClientListItem> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  memberCount: z.number(),
  assistantCount: z.number(),
  subscriptionStatus: z.string().nullable(),
  openEscalations: z.number(),
});

export const adminClientListSchema: z.ZodType<AdminClientList> = z.object({
  clients: z.array(adminClientListItemSchema),
});

export const adminClientDetailSchema: z.ZodType<AdminClientDetail> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  memberCount: z.number(),
  assistantCount: z.number(),
  subscriptionStatus: z.string().nullable(),
  openEscalations: z.number(),
  members: z.array(
    z.object({ email: z.string(), fullName: z.string().nullable(), role: z.string() }),
  ),
  assistants: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      role: z.string(),
      state: z.string(),
      onboarding: z.string(),
    }),
  ),
  subscription: subSummarySchemaRef.nullable(),
  recentInvoices: z.array(
    z.object({
      number: z.string(),
      status: z.string(),
      totalEur: z.number(),
      issuedAt: z.string(),
    }),
  ),
  recentEscalations: z.array(
    z.object({
      id: z.string().uuid(),
      question: z.string(),
      status: z.string(),
      createdAt: z.string(),
    }),
  ),
});
