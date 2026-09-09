import { z } from "zod";

/**
 * Moteur « employé virtuel » (§9.3). Le produit ne dépend jamais d'un fournisseur
 * de modèle : tout passe par ces formes. Quand l'assistant n'est pas sûr, il
 * escalade — il n'invente pas.
 */

export type RuntimeReplyKind = "reply" | "escalate" | "appointment";

export type AppointmentStatus = "propose" | "confirme" | "annule";

export interface AppointmentRow {
  id: string;
  customerLabel: string;
  requestedText: string;
  slot: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

/** Réponse d'un tour de conversation (essai côté client, ou demande entrante). */
export interface RuntimeTurn {
  sessionId: string;
  conversationId: string;
  kind: RuntimeReplyKind;
  /** Ce que l'assistant répond au client (vide s'il escalade en silence). */
  reply: string;
  /** Vrai si la demande a été transmise au patron. */
  escalated: boolean;
  /** Renseigné quand `kind === "appointment"`. */
  appointment: { slot: string | null; status: AppointmentStatus } | null;
}

export const appointmentRowSchema: z.ZodType<AppointmentRow> = z.object({
  id: z.string().uuid(),
  customerLabel: z.string(),
  requestedText: z.string(),
  slot: z.string().nullable(),
  status: z.enum(["propose", "confirme", "annule"]),
  createdAt: z.string(),
});

export const runtimeTurnSchema: z.ZodType<RuntimeTurn> = z.object({
  sessionId: z.string(),
  conversationId: z.string(),
  kind: z.enum(["reply", "escalate", "appointment"]),
  reply: z.string(),
  escalated: z.boolean(),
  appointment: z
    .object({ slot: z.string().nullable(), status: z.enum(["propose", "confirme", "annule"]) })
    .nullable(),
});

// requests

export const simulateSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  /** Reprend la même conversation d'essai entre deux messages. */
  sessionId: z.string().trim().max(80).optional(),
});
export type Simulate = z.infer<typeof simulateSchema>;

export const inboundSchema = z.object({
  channel: z.enum([
    "telephone",
    "whatsapp",
    "email",
    "instagram",
    "formulaire",
    "surplace",
    "autre",
  ]),
  /** Identifiant du client côté canal (numéro, pseudo…) — non affiché en clair. */
  from: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(4000),
});
export type Inbound = z.infer<typeof inboundSchema>;

export interface InboundResult {
  status: "handled" | "paused" | "not_found";
  kind: RuntimeReplyKind | null;
  reply: string | null;
}
export const inboundResultSchema: z.ZodType<InboundResult> = z.object({
  status: z.enum(["handled", "paused", "not_found"]),
  kind: z.enum(["reply", "escalate", "appointment"]).nullable(),
  reply: z.string().nullable(),
});
