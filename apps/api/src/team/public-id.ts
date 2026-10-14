import { randomBytes } from "node:crypto";

/** Identifiant opaque d'assistant pour l'arrivée des demandes (webhooks des canaux, formulaire). */
export function newPublicId(): string {
  return `asst_${randomBytes(12).toString("base64url")}`;
}
