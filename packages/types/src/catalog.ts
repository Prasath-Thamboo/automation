import { z } from "zod";

/**
 * Catalogue d'employés virtuels prêts à l'emploi (§5).
 *
 * Les types publics sont écrits à la main (interfaces), et les schémas Zod sont
 * annotés `z.ZodType<...>`. Raison : `z.infer` sur des schémas profondément
 * imbriqués produit des types énormes qui, une fois traversant les frontières de
 * paquets, déclenchent l'erreur TS2719 (« deux types du même nom, non liés »).
 * Des interfaces nominales rendent le contrat stable et lisible.
 */

export type TemplateStatus = "draft" | "published" | "archived";
export const templateStatus = z.enum(["draft", "published", "archived"]);

/** Un point de la « journée type » (§5.1 point 2). */
export interface DayMoment {
  time: string;
  text: string;
}

/** Un message de la démonstration jouable (§5.1 point 5), pré-scriptée. */
export interface DemoMessage {
  from: "client" | "assistant";
  text: string;
}

/** Un curseur du calcul « ce qu'il vous fait gagner » (§5.1 point 6). */
export interface SavingsSlider {
  label: string;
  min: number;
  max: number;
  default: number;
  /** Minutes gagnées par unité et par jour. */
  minutesEach: number;
}

export type PersonalizationFieldType = "text" | "textarea" | "boolean" | "choice";

/** Une question de personnalisation du « premier jour » (§5.2). Rendue au Lot 5. */
export interface PersonalizationField {
  key: string;
  label: string;
  type: PersonalizationFieldType;
  options?: string[];
  required: boolean;
}

export interface TemplateContent {
  assistantName: string;
  assistantRole: string;
  intro: string;
  dayTimeline: DayMoment[];
  canDo: string[];
  cannotDo: string[];
  demo: { intro: string; messages: DemoMessage[] };
  savings: {
    sliderA: SavingsSlider;
    sliderB: SavingsSlider;
    daysPerMonth: number;
    note: string;
  };
  contract: { included: string[]; cancellation: string };
  personalization: PersonalizationField[];
}

export interface ProfessionCard {
  slug: string;
  name: string;
  sector: string;
  benefit: string;
  needs: string[];
  assistantName: string;
  monthlyPriceEur: number;
  trialDays: number;
}

export interface CatalogList {
  professions: ProfessionCard[];
  sectors: string[];
  needs: string[];
}

export interface ProfessionDetail extends ProfessionCard {
  setupPriceEur: number;
  content: TemplateContent;
}

export interface AdminProfession {
  id: string;
  slug: string;
  name: string;
  sector: string;
  benefit: string;
  needs: string[];
  monthlyPriceEur: number;
  setupPriceEur: number;
  trialDays: number;
  position: number;
  published: boolean;
  hasDraft: boolean;
  publishedVersion: number | null;
  draftContent: TemplateContent | null;
  publishedContent: TemplateContent | null;
  updatedAt: string;
}

export interface AdminProfessionList {
  professions: AdminProfession[];
}

// ── Schémas ─────────────────────────────────────────────────────────────────

const savingsSliderSchema: z.ZodType<SavingsSlider> = z.object({
  label: z.string().trim().min(1).max(80),
  min: z.number().int().min(0),
  max: z.number().int().positive(),
  default: z.number().int().min(0),
  minutesEach: z.number().min(0).max(120),
});

export const templateContentSchema: z.ZodType<TemplateContent> = z.object({
  assistantName: z.string().trim().min(1).max(40),
  assistantRole: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(400),
  dayTimeline: z
    .array(z.object({ time: z.string().trim().min(1).max(20), text: z.string().trim().min(1).max(400) }))
    .min(3)
    .max(12),
  canDo: z.array(z.string().trim().min(1).max(200)).min(4).max(10),
  cannotDo: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  demo: z.object({
    intro: z.string().trim().min(1).max(300),
    messages: z
      .array(z.object({ from: z.enum(["client", "assistant"]), text: z.string().trim().min(1).max(600) }))
      .min(2)
      .max(30),
  }),
  savings: z.object({
    sliderA: savingsSliderSchema,
    sliderB: savingsSliderSchema,
    daysPerMonth: z.number().int().min(1).max(31),
    note: z.string().trim().min(1).max(300),
  }),
  contract: z.object({
    included: z.array(z.string().trim().min(1).max(200)).min(2).max(10),
    cancellation: z.string().trim().min(1).max(400),
  }),
  personalization: z
    .array(
      z.object({
        key: z
          .string()
          .trim()
          .regex(/^[a-z][a-z0-9_]*$/, "clé en minuscules, sans espace"),
        label: z.string().trim().min(1).max(200),
        type: z.enum(["text", "textarea", "boolean", "choice"]),
        options: z.array(z.string().trim().min(1)).optional(),
        required: z.boolean(),
      }),
    )
    .max(10),
});

export const professionCardSchema: z.ZodType<ProfessionCard> = z.object({
  slug: z.string(),
  name: z.string(),
  sector: z.string(),
  benefit: z.string(),
  needs: z.array(z.string()),
  assistantName: z.string(),
  monthlyPriceEur: z.number().int(),
  trialDays: z.number().int(),
});

export const catalogListSchema: z.ZodType<CatalogList> = z.object({
  professions: z.array(professionCardSchema),
  sectors: z.array(z.string()),
  needs: z.array(z.string()),
});

export const professionDetailSchema: z.ZodType<ProfessionDetail> = z.object({
  slug: z.string(),
  name: z.string(),
  sector: z.string(),
  benefit: z.string(),
  needs: z.array(z.string()),
  assistantName: z.string(),
  monthlyPriceEur: z.number().int(),
  trialDays: z.number().int(),
  setupPriceEur: z.number().int(),
  content: templateContentSchema,
});

const slugRule = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug en minuscules, tirets uniquement");

export const createProfessionSchema = z.object({
  slug: slugRule,
  name: z.string().trim().min(1).max(120),
  sector: z.string().trim().min(1).max(80),
  benefit: z.string().trim().min(1).max(200),
  needs: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  monthlyPriceEur: z.number().int().min(0).max(100_000).default(89),
  setupPriceEur: z.number().int().min(0).max(1_000_000).default(0),
  trialDays: z.number().int().min(0).max(365).default(14),
  position: z.number().int().min(0).default(0),
});
export type CreateProfession = z.infer<typeof createProfessionSchema>;

export const updateProfessionSchema = z.object({
  slug: slugRule.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  sector: z.string().trim().min(1).max(80).optional(),
  benefit: z.string().trim().min(1).max(200).optional(),
  needs: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  monthlyPriceEur: z.number().int().min(0).max(100_000).optional(),
  setupPriceEur: z.number().int().min(0).max(1_000_000).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  position: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});
export type UpdateProfession = z.infer<typeof updateProfessionSchema>;

export const adminProfessionSchema: z.ZodType<AdminProfession> = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  sector: z.string(),
  benefit: z.string(),
  needs: z.array(z.string()),
  monthlyPriceEur: z.number().int(),
  setupPriceEur: z.number().int(),
  trialDays: z.number().int(),
  position: z.number().int(),
  published: z.boolean(),
  hasDraft: z.boolean(),
  publishedVersion: z.number().int().nullable(),
  draftContent: templateContentSchema.nullable(),
  publishedContent: templateContentSchema.nullable(),
  updatedAt: z.string(),
});

export const adminProfessionListSchema: z.ZodType<AdminProfessionList> = z.object({
  professions: z.array(adminProfessionSchema),
});
