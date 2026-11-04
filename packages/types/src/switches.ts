import { z } from "zod";

/**
 * Lot 14 — pilotage d'un employé par boutons. L'équipe Tando construit le flux
 * n8n du client et déclare ses boutons dans le back-office ; le client ne fait
 * que les activer ou les couper (web + mobile). Côté client, on parle de « ce
 * qu'il fait pour vous », jamais du flux.
 */

/** Un bouton tel que le voit le client. */
export interface AssistantSwitch {
  key: string;
  label: string;
  help: string | null;
  enabled: boolean;
}

export const assistantSwitchSchema: z.ZodType<AssistantSwitch> = z.object({
  key: z.string(),
  label: z.string(),
  help: z.string().nullable(),
  enabled: z.boolean(),
});

export const setSwitchSchema = z.object({ enabled: z.boolean() });
export type SetSwitch = z.infer<typeof setSwitchSchema>;

// ── Back-office ─────────────────────────────────────────────────────────────

export interface AdminSwitch extends AssistantSwitch {
  id: string;
  position: number;
}

export interface AdminAssistantSetup {
  assistant: { id: string; name: string; organizationId: string; state: string };
  /** Webhook du flux n8n de ce client (null : pas encore branché). */
  workflowUrl: string | null;
  switches: AdminSwitch[];
}

const adminSwitchSchema: z.ZodType<AdminSwitch> = z.object({
  id: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  help: z.string().nullable(),
  enabled: z.boolean(),
  position: z.number().int(),
});

export const adminAssistantSetupSchema: z.ZodType<AdminAssistantSetup> = z.object({
  assistant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    organizationId: z.string().uuid(),
    state: z.string(),
  }),
  workflowUrl: z.string().nullable(),
  switches: z.array(adminSwitchSchema),
});

export const updateWorkflowSchema = z.object({
  workflowUrl: z.string().trim().url().max(500).nullable(),
});
export type UpdateWorkflow = z.infer<typeof updateWorkflowSchema>;

const label = z.string().trim().min(2).max(80);
const help = z.string().trim().max(200).nullable();

export const createSwitchSchema = z.object({
  /** Lue par le flux n8n : minuscules, chiffres, soulignés. */
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,39}$/, "Clé : 2 à 40 caractères, minuscules, chiffres ou _."),
  label,
  help: help.default(null),
  enabled: z.boolean().default(false),
  position: z.number().int().min(0).max(999).default(0),
});
export type CreateSwitch = z.infer<typeof createSwitchSchema>;

export const updateSwitchSchema = z
  .object({
    label,
    help,
    enabled: z.boolean(),
    position: z.number().int().min(0).max(999),
  })
  .partial();
export type UpdateSwitch = z.infer<typeof updateSwitchSchema>;

// ── Lot 16 — employé générique « prêt à l'emploi » ──────────────────────────

/** Bouton créé pour chaque nouvel employé d'un métier du catalogue. */
export const defaultSwitchSchema = z.object({
  key: createSwitchSchema.shape.key,
  label,
  help: help.default(null),
  enabled: z.boolean().default(false),
});
export type DefaultSwitch = z.infer<typeof defaultSwitchSchema>;

export interface AdminProfessionWorkflow {
  professionId: string;
  slug: string;
  /** Webhook du flux n8n générique du métier (null : moteur à règles). */
  workflowUrl: string | null;
  defaultSwitches: DefaultSwitch[];
  /** Employés de ce métier qui passent par ce flux (sans flux propre). */
  assistantsOnFlow: number;
}

export const adminProfessionWorkflowSchema: z.ZodType<AdminProfessionWorkflow> = z.object({
  professionId: z.string().uuid(),
  slug: z.string(),
  workflowUrl: z.string().nullable(),
  defaultSwitches: z.array(
    z.object({ key: z.string(), label: z.string(), help: z.string().nullable(), enabled: z.boolean() }),
  ),
  assistantsOnFlow: z.number().int(),
});

export const updateProfessionWorkflowSchema = z.object({
  workflowUrl: z.string().trim().url().max(500).nullable(),
  defaultSwitches: z
    .array(defaultSwitchSchema)
    .max(20)
    .refine((list) => new Set(list.map((s) => s.key)).size === list.length, "Clés de boutons en double."),
});
export type UpdateProfessionWorkflow = z.infer<typeof updateProfessionWorkflowSchema>;

/** Corps de `POST /me/catalog/subscribe`. */
export const subscribeCatalogSchema = z.object({ slug: z.string().trim().min(1).max(80) });
export type SubscribeCatalog = z.infer<typeof subscribeCatalogSchema>;
