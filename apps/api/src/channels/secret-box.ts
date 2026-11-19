import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

/**
 * Trousseau de clés AES-256 versionnées (Lot 19). On chiffre toujours avec la
 * clé `current` ; on sait encore lire avec les anciennes, le temps que
 * `ChannelKeyRotationService` rechiffre tout.
 */
export interface Keyring {
  current: number;
  keys: ReadonlyMap<number, Buffer>;
}

/** Un trousseau à une seule clé (tests, compatibilité). */
export function singleKey(key: Buffer, version = 1): Keyring {
  return { current: version, keys: new Map([[version, key]]) };
}

/**
 * Chiffre `plain` en AES-256-GCM avec la clé courante.
 * Format : `v<version>.<iv>.<tag>.<chiffré>` (base64url). Les valeurs `v1.`
 * d'avant le Lot 19 sont donc lues avec la clé de version 1.
 */
export function seal(plain: string, ring: Keyring): string {
  const key = ring.keys.get(ring.current);
  if (!key) throw new Error(`Clé de chiffrement v${ring.current} absente du trousseau.`);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [`v${ring.current}`, ...[iv, tag, ct].map((p) => p.toString("base64url"))].join(".");
}

/** Version de clé d'une valeur chiffrée, ou `null` si le format est inconnu. */
export function sealedVersion(sealed: string): number | null {
  const m = /^v([1-9]\d*)\./.exec(sealed);
  return m ? Number(m[1]) : null;
}

/** Déchiffre une valeur produite par `seal`. `null` si altérée ou clé inconnue. */
export function open(sealed: string, ring: Keyring): string | null {
  const version = sealedVersion(sealed);
  const key = version === null ? undefined : ring.keys.get(version);
  const [, iv, tag, ct] = sealed.split(".");
  if (!key || !iv || !tag || ct === undefined) return null;
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

function decodeKey(b64: string, name: string): Buffer {
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error(`${name} doit faire 32 octets (base64).`);
  return key;
}

/**
 * Trousseau depuis l'environnement :
 * - `CHANNEL_SECRET_KEY` + `CHANNEL_SECRET_KEY_VERSION` (défaut 1) : clé courante ;
 * - `CHANNEL_SECRET_KEY_PREVIOUS` : anciennes clés, `version:base64` séparées par
 *   des virgules, gardées le temps du rechiffrement.
 * Hors production, sans clé : clé v1 dérivée de SESSION_SECRET.
 */
export function channelKeyring(env: Env): Keyring {
  const current = env.CHANNEL_SECRET_KEY_VERSION;
  const keys = new Map<number, Buffer>();
  if (env.CHANNEL_SECRET_KEY) {
    keys.set(current, decodeKey(env.CHANNEL_SECRET_KEY, "CHANNEL_SECRET_KEY"));
  } else {
    if (current !== 1) throw new Error("CHANNEL_SECRET_KEY_VERSION exige CHANNEL_SECRET_KEY.");
    keys.set(1, createHash("sha256").update(`velekya-channels:${env.SESSION_SECRET}`).digest());
  }
  for (const entry of (env.CHANNEL_SECRET_KEY_PREVIOUS ?? "").split(",")) {
    const item = entry.trim();
    if (!item) continue;
    const sep = item.indexOf(":");
    const version = Number(item.slice(0, sep));
    if (sep < 1 || !Number.isInteger(version) || version < 1) {
      throw new Error("CHANNEL_SECRET_KEY_PREVIOUS : format attendu « version:clé_base64, … ».");
    }
    if (keys.has(version)) {
      throw new Error(`CHANNEL_SECRET_KEY_PREVIOUS : la version ${version} est déjà utilisée.`);
    }
    keys.set(version, decodeKey(item.slice(sep + 1), `CHANNEL_SECRET_KEY_PREVIOUS (v${version})`));
  }
  return { current, keys };
}

/**
 * Coffre des données de canal : adresses de réponse des clients finaux et
 * secrets des canaux (§9.4 — jamais en clair en base ni dans les logs).
 */
@Injectable()
export class SecretBox {
  private readonly ring: Keyring;

  constructor(@Inject(ENV) env: Env) {
    this.ring = channelKeyring(env);
  }

  /** Version de la clé utilisée pour chiffrer. */
  get currentVersion(): number {
    return this.ring.current;
  }

  seal(plain: string): string {
    return seal(plain, this.ring);
  }

  open(sealed: string | null | undefined): string | null {
    return sealed ? open(sealed, this.ring) : null;
  }
}
