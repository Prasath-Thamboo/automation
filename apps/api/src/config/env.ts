/**
 * Validation de la configuration au démarrage. L'API refuse de démarrer si une
 * variable obligatoire manque ou est mal formée (§9.4 : validation stricte de
 * toute entrée, secrets hors du dépôt).
 *
 * Toutes les apps lisent le même `.env` à la racine du monorepo.
 */
import { z } from "zod";

const booleanish = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  API_PORT: z.coerce.number().int().positive().default(3333),
  API_URL: z.string().url().default("http://localhost:3333"),
  /** Origines autorisées CORS, séparées par des virgules. */
  WEB_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
  SESSION_COOKIE: z.string().default("tando_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  MAGIC_LINK_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanish.default("false"),
  MAIL_FROM: z.string().default("Tando <bonjour@tando.local>"),

  /** Base des liens magiques web. Premier élément de WEB_ORIGIN si absent. */
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  /** Schéma de lien profond mobile : <scheme>://verifier?token=... */
  MOBILE_DEEP_LINK_SCHEME: z.string().default("tando"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(racine)"} : ${i.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return parsed.data;
}

/** Base d'URL du site web (pour construire les liens magiques web). */
export function webBaseUrl(env: Env): string {
  return env.NEXT_PUBLIC_SITE_URL ?? env.WEB_ORIGIN[0] ?? "http://localhost:3000";
}
