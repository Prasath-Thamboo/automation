import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

const VERSION = "v1";

/** Chiffre `plain` en AES-256-GCM. Format : `v1.<iv>.<tag>.<chiffré>` (base64url). */
export function seal(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Déchiffre une valeur produite par `seal`. `null` si altérée ou mauvaise clé. */
export function open(sealed: string, key: Buffer): string | null {
  const [version, iv, tag, ct] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || ct === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ct, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Clé de 32 octets : `CHANNEL_SECRET_KEY` (base64) ou, hors production, dérivée de SESSION_SECRET. */
export function channelKey(env: Env): Buffer {
  if (env.CHANNEL_SECRET_KEY) {
    const key = Buffer.from(env.CHANNEL_SECRET_KEY, "base64");
    if (key.length !== 32) throw new Error("CHANNEL_SECRET_KEY doit faire 32 octets (base64).");
    return key;
  }
  return createHash("sha256").update(`velekya-channels:${env.SESSION_SECRET}`).digest();
}

/**
 * Coffre des données de canal : adresses de réponse des clients finaux et
 * secrets des canaux (§9.4 — jamais en clair en base ni dans les logs).
 */
@Injectable()
export class SecretBox {
  private readonly key: Buffer;

  constructor(@Inject(ENV) env: Env) {
    this.key = channelKey(env);
  }

  seal(plain: string): string {
    return seal(plain, this.key);
  }

  open(sealed: string | null | undefined): string | null {
    return sealed ? open(sealed, this.key) : null;
  }
}
