import { z } from "zod";

/**
 * Notifications push et réglages (§6bis — application mobile).
 * Vocabulaire client (§2) : « quand il ne sait pas répondre », « résumé de la
 * veille », « heures de silence ». Jamais de notification marketing.
 */

export type DevicePlatform = "ios" | "android";

export interface NotificationPrefs {
  /** Une demande que l'assistant n'a pas su traiter → notification immédiate. */
  escalations: boolean;
  /** Un résumé de la veille, une fois par jour. */
  dailySummary: boolean;
  /** Heure locale d'envoi du résumé (0–23). */
  dailySummaryHour: number;
  /** Un paiement d'abonnement qui échoue. */
  paymentFailure: boolean;
  /** Fenêtre de silence « HH:mm » (heure locale), ou null si désactivée. */
  quietStart: string | null;
  quietEnd: string | null;
  /** Fuseau de l'appareil (IANA), pour l'heure du résumé et le silence. */
  timezone: string;
}

// ── Schémas ───────────────────────────────────────────────────────────────

const platformEnum = z.enum(["ios", "android"]);
const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue au format HH:mm.");

export const notificationPrefsSchema: z.ZodType<NotificationPrefs> = z.object({
  escalations: z.boolean(),
  dailySummary: z.boolean(),
  dailySummaryHour: z.number().int().min(0).max(23),
  paymentFailure: z.boolean(),
  quietStart: hhmm.nullable(),
  quietEnd: hhmm.nullable(),
  timezone: z.string(),
});

// requests

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(1).max(300),
  platform: platformEnum,
  deviceName: z.string().trim().max(120).optional(),
});
export type RegisterPushToken = z.infer<typeof registerPushTokenSchema>;

export const removePushTokenSchema = z.object({
  token: z.string().trim().min(1).max(300),
});
export type RemovePushToken = z.infer<typeof removePushTokenSchema>;

export const updateNotificationPrefsSchema = z
  .object({
    escalations: z.boolean(),
    dailySummary: z.boolean(),
    dailySummaryHour: z.number().int().min(0).max(23),
    paymentFailure: z.boolean(),
    quietStart: hhmm.nullable(),
    quietEnd: hhmm.nullable(),
    timezone: z.string().trim().min(1).max(64),
  })
  .partial();
export type UpdateNotificationPrefs = z.infer<typeof updateNotificationPrefsSchema>;
