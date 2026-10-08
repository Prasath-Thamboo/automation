import { createHmac, timingSafeEqual } from "node:crypto";

/** Comparaison à temps constant (jetons, signatures). */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmacBase64(algo: "sha1" | "sha256", key: string, data: string): string {
  return createHmac(algo, key).update(data, "utf8").digest("base64");
}

export function hmacHex(algo: "sha1" | "sha256", key: string, data: string): string {
  return createHmac(algo, key).update(data, "utf8").digest("hex");
}
