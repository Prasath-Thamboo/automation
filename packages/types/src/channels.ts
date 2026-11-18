import { z } from "zod";

/**
 * Lot 12 — Canaux de réception : par où les clients du patron joignent son
 * employé virtuel (formulaire du site, email, SMS / appels, WhatsApp, Instagram).
 */

export type ChannelKind = "formulaire" | "email" | "sms" | "telephone" | "whatsapp" | "instagram";
/** `en_attente` : raccordement en cours par l'équipe Velekya. */
export type ChannelStatus = "en_attente" | "actif" | "desactive";

export const channelKindEnum = z.enum(["formulaire", "email", "sms", "telephone", "whatsapp", "instagram"]);
export const channelStatusEnum = z.enum(["en_attente", "actif", "desactive"]);

/** Vue client d'un canal. */
export interface ChannelView {
  kind: ChannelKind;
  status: ChannelStatus;
  /** Ce que le patron communique à ses clients : adresse, numéro, compte… */
  display: string;
}

export interface AssistantChannels {
  channels: ChannelView[];
  /** Page publique du formulaire (à mettre en lien depuis son site). */
  formUrl: string;
  /** Code à coller dans son site pour afficher le formulaire. */
  formSnippet: string;
}

export const channelViewSchema: z.ZodType<ChannelView> = z.object({
  kind: channelKindEnum,
  status: channelStatusEnum,
  display: z.string(),
});

export const assistantChannelsSchema: z.ZodType<AssistantChannels> = z.object({
  channels: z.array(channelViewSchema),
  formUrl: z.string(),
  formSnippet: z.string(),
});

// ── Formulaire public ─────────────────────────────────────────────────────

/** En-tête du formulaire public (ce qu'affiche la page avant le premier message). */
export interface PublicFormInfo {
  establishment: string;
  assistantName: string;
  open: boolean;
}

export const publicFormInfoSchema: z.ZodType<PublicFormInfo> = z.object({
  establishment: z.string(),
  assistantName: z.string(),
  open: z.boolean(),
});

export const formMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  name: z.string().trim().max(80).optional(),
  /** Pour recevoir la réponse plus tard si elle doit être vérifiée. */
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  /** Reprend la même discussion entre deux messages (généré par le serveur). */
  sessionId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,40}$/).optional(),
  /** Piège à robots : doit rester vide. */
  website: z.string().max(200).optional(),
});
export type FormMessage = z.infer<typeof formMessageSchema>;

export interface FormReply {
  sessionId: string;
  /** Réponse immédiate à afficher (null : message reçu, réponse à venir). */
  reply: string | null;
  status: "handled" | "paused";
}

export const formReplySchema: z.ZodType<FormReply> = z.object({
  sessionId: z.string(),
  reply: z.string().nullable(),
  status: z.enum(["handled", "paused"]),
});

// ── Back-office : raccordement des canaux par l'équipe Velekya ──────────────

export interface AdminChannel {
  id: string;
  kind: ChannelKind;
  /** Identifiant côté canal (numéro E.164, email, phone_number_id, id du compte). */
  address: string;
  status: ChannelStatus;
  /** Ce que voit le patron (numéro formaté, @compte…). */
  display: string;
  /** Renvoi d'appel vers le patron (téléphone uniquement). */
  forwardTo: string | null;
  /** Un jeton d'accès Meta est enregistré (jamais renvoyé). */
  hasSecret: boolean;
  createdAt: string;
}

export interface AdminChannelList {
  assistant: { id: string; name: string; organizationId: string; publicId: string | null };
  channels: AdminChannel[];
}

export const adminChannelSchema: z.ZodType<AdminChannel> = z.object({
  id: z.string().uuid(),
  kind: channelKindEnum,
  address: z.string(),
  status: channelStatusEnum,
  display: z.string(),
  forwardTo: z.string().nullable(),
  hasSecret: z.boolean(),
  createdAt: z.string(),
});

export const adminChannelListSchema: z.ZodType<AdminChannelList> = z.object({
  assistant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    organizationId: z.string().uuid(),
    publicId: z.string().nullable(),
  }),
  channels: z.array(adminChannelSchema),
});

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const createAdminChannelSchema = z.object({
  kind: channelKindEnum,
  address: z.string().trim().min(1, "L'identifiant du canal est obligatoire.").max(200),
  status: channelStatusEnum.default("actif"),
  display: optionalText(120),
  forwardTo: optionalText(40),
  /** Jeton d'accès Meta (WhatsApp / Instagram). Chiffré à l'enregistrement. */
  accessToken: optionalText(1000),
});
export type CreateAdminChannel = z.infer<typeof createAdminChannelSchema>;

export const updateAdminChannelSchema = z.object({
  status: channelStatusEnum.optional(),
  display: optionalText(120),
  forwardTo: optionalText(40),
  accessToken: optionalText(1000),
});
export type UpdateAdminChannel = z.infer<typeof updateAdminChannelSchema>;
