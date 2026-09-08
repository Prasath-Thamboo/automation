import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Jetons opaques pour les liens magiques et les sessions.
 * On ne stocke jamais le jeton en clair : seulement son hash SHA-256.
 * La comparaison se fait sur le hash, en temps constant.
 */

/** 32 octets aléatoires encodés base64url — ~43 caractères. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
