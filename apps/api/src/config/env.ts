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
  /**
   * Sert la doc OpenAPI sur `/api/docs`. Par défaut : ouverte hors production,
   * fermée en production. Surcharge explicite possible.
   */
  API_DOCS_ENABLED: booleanish.optional(),

  // --- Observabilité ---
  /** Une ligne de log par requête HTTP (méthode, chemin, statut, durée). */
  REQUEST_LOG_ENABLED: booleanish.default("true"),
  /** Au-delà, la requête est journalisée en `warn` (seuil de lenteur). */
  SLOW_REQUEST_MS: z.coerce.number().int().positive().default(1000),
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

  // --- Limitation de débit (§9.4) ---
  /** Fenêtre glissante du rate limiting global, en secondes. */
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  /** Nombre de requêtes autorisées par fenêtre et par IP. */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  /** Coupe le rate limiting (tests e2e / dev). Interdit en production. */
  RATE_LIMIT_DISABLED: booleanish.default("false"),

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

  // --- Facturation (Lot 4) ---
  /** Taux de TVA par défaut, en pourcentage. */
  VAT_RATE_PCT: z.coerce.number().min(0).max(100).default(20),
  /** Identité du vendeur, figée dans chaque facture (mentions légales). */
  SELLER_NAME: z.string().default("Tando"),
  SELLER_LEGAL: z
    .string()
    .default("[À COMPLÉTER — forme juridique, capital, SIREN, RCS, TVA intracommunautaire]"),
  SELLER_ADDRESS: z.string().default("[À COMPLÉTER — adresse du siège social]"),
  /** Fournisseur de paiement : `fake` (dev/CI) ou `stripe`. */
  PAYMENT_PROVIDER: z.enum(["fake", "stripe"]).default("fake"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // --- Abonnement / stores (Lot 9) ---
  /** Rail d'abonnement. `out-of-app` (défaut) = géré sur le web ; `revenuecat` réservé. */
  BILLING_PROVIDER: z.enum(["out-of-app", "revenuecat"]).default("out-of-app"),
  /** Adresse de gestion du contrat (espace client web), affichée dans l'app mobile. */
  BILLING_MANAGE_URL: z.string().url().default("http://localhost:3000/mon-equipe/compte"),
  /** Phrase de renvoi vers la gestion du contrat, affichée telle quelle. */
  BILLING_MANAGE_HINT: z
    .string()
    .default("Gérez votre contrat depuis votre espace, sur tando.fr."),

  // --- Moteur « employé virtuel » (Lot 6) ---
  /** Implémentation de `AssistantRuntime` : `rules` (défaut) ou `n8n`. */
  ASSISTANT_RUNTIME: z.enum(["rules", "n8n"]).default("rules"),
  /**
   * Webhook n8n appelé à chaque message (Lot 13). `{workflow}` est remplacé par
   * le métier (`dentiste`…, `sur-mesure`), ex. `https://n8n.tando.fr/webhook/tando-{workflow}`.
   */
  N8N_WEBHOOK_URL: z.string().url().optional(),
  /** Secret envoyé en en-tête `X-Tando-Token` (Header Auth du nœud Webhook). */
  N8N_TOKEN: z.string().optional(),
  /** Au-delà, le message est transmis au patron (escalade). */
  N8N_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  // --- Canaux de réception (Lot 12) ---
  /**
   * Clé AES-256 (base64, 32 octets) qui chiffre les adresses de réponse des
   * clients et les secrets des canaux. Obligatoire en production ; dérivée de
   * SESSION_SECRET ailleurs.
   */
  CHANNEL_SECRET_KEY: z.string().optional(),
  /** `fake` : les envois SMS / WhatsApp / Instagram sont simulés. Les emails
   *  partent toujours par SMTP (mailpit en dev). */
  CHANNELS_DELIVERY: z.enum(["fake", "live"]).default("fake"),
  /** Domaine des adresses de réception (`<nom>@<domaine>`), routé vers Brevo. */
  INBOUND_EMAIL_DOMAIN: z.string().default("in.tando.local"),
  /** Jeton exigé dans l'URL du webhook de réception Brevo (`?token=`). */
  BREVO_INBOUND_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  /** Signe les webhooks Twilio (HMAC-SHA1) et authentifie l'envoi. */
  TWILIO_AUTH_TOKEN: z.string().optional(),
  /** URL publique de l'API telle que Twilio l'appelle (sert au calcul de signature). */
  TWILIO_WEBHOOK_BASE_URL: z.string().url().optional(),
  TWILIO_API_URL: z.string().url().default("https://api.twilio.com"),
  /** Secret de l'application Meta (signature `X-Hub-Signature-256`). */
  META_APP_SECRET: z.string().optional(),
  /** Jeton de vérification de l'abonnement webhook Meta (`hub.verify_token`). */
  META_VERIFY_TOKEN: z.string().optional(),
  META_GRAPH_URL: z.string().url().default("https://graph.facebook.com/v21.0"),

  // --- Notifications push (Lot 8, §6bis) ---
  /** Coupe l'envoi réel des notifications (utile en dev/CI). */
  PUSH_ENABLED: booleanish.default("true"),
  /** Endpoint de l'API Expo Push. */
  EXPO_PUSH_URL: z.string().url().default("https://exp.host/--/api/v2/push/send"),
  /** Jeton d'accès Expo (recommandé en production, facultatif en dev). */
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

const envWithGuards = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && env.RATE_LIMIT_DISABLED) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["RATE_LIMIT_DISABLED"],
      message: "Le rate limiting ne peut pas être désactivé en production.",
    });
  }
  if (env.ASSISTANT_RUNTIME === "n8n" && !env.N8N_WEBHOOK_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["N8N_WEBHOOK_URL"],
      message: "Obligatoire avec ASSISTANT_RUNTIME=n8n.",
    });
  }
  if (env.NODE_ENV === "production" && env.ASSISTANT_RUNTIME === "n8n" && !env.N8N_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["N8N_TOKEN"],
      message: "Obligatoire en production avec ASSISTANT_RUNTIME=n8n.",
    });
  }
  if (env.NODE_ENV === "production" && !env.CHANNEL_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CHANNEL_SECRET_KEY"],
      message: "Obligatoire en production (openssl rand -base64 32).",
    });
  }
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envWithGuards.safeParse(source);
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

/**
 * Secrets des webhooks de canaux. Hors production, des valeurs de dev
 * permettent de tester sans compte fournisseur ; en production, un secret
 * absent ferme le webhook correspondant (403).
 */
export function channelWebhookSecrets(env: Env): {
  brevoToken?: string;
  twilioToken?: string;
  metaAppSecret?: string;
  metaVerifyToken?: string;
} {
  const dev = env.NODE_ENV !== "production";
  return {
    brevoToken: env.BREVO_INBOUND_TOKEN ?? (dev ? "dev-brevo-inbound" : undefined),
    twilioToken: env.TWILIO_AUTH_TOKEN ?? (dev ? "dev-twilio-token" : undefined),
    metaAppSecret: env.META_APP_SECRET ?? (dev ? "dev-meta-secret" : undefined),
    metaVerifyToken: env.META_VERIFY_TOKEN ?? (dev ? "dev-meta-verify" : undefined),
  };
}

/** Faut-il exposer la doc OpenAPI ? Fermée par défaut en production. */
export function shouldServeApiDocs(env: Env): boolean {
  return env.API_DOCS_ENABLED ?? env.NODE_ENV !== "production";
}
