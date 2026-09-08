import { z } from "zod";
import { membershipRole } from "./common";

/** Demande d'un lien magique. Envoyé par le web et le mobile. */
export const requestMagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  /**
   * D'où vient la demande : détermine la forme du lien renvoyé dans l'email.
   * `web`  -> https://site/connexion/verifier?token=...
   * `mobile` -> tando://verifier?token=...
   */
  channel: z.enum(["web", "mobile"]).default("web"),
});
export type RequestMagicLink = z.infer<typeof requestMagicLinkSchema>;

/** Échange d'un token de lien magique contre une session. */
export const verifyMagicLinkSchema = z.object({
  token: z.string().min(20),
});
export type VerifyMagicLink = z.infer<typeof verifyMagicLinkSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  organizationId: z.string().uuid(),
  organizationName: z.string(),
  role: membershipRole,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Réponse de `/auth/verify` (web : pose un cookie ; mobile : renvoie aussi le jeton). */
export const authResultSchema = z.object({
  user: sessionUserSchema,
  /** Présent uniquement pour le canal mobile ; stocké dans expo-secure-store. */
  token: z.string().optional(),
});
export type AuthResult = z.infer<typeof authResultSchema>;
