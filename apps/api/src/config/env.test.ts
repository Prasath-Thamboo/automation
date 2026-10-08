import { describe, expect, it } from "vitest";
import { channelWebhookSecrets, loadEnv, shouldServeApiDocs } from "./env";

const base = {
  DATABASE_URL: "postgresql://tando:tando@localhost:5432/tando?schema=public",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "x".repeat(32),
};
/** Production : la clé de chiffrement des canaux est obligatoire (Lot 12). */
const prodKey = { CHANNEL_SECRET_KEY: Buffer.alloc(32, 1).toString("base64") };

describe("loadEnv — rate limiting", () => {
  it("valeurs par défaut : rate limiting actif", () => {
    const env = loadEnv({ ...base });
    expect(env.RATE_LIMIT_DISABLED).toBe(false);
    expect(env.RATE_LIMIT_TTL_SECONDS).toBe(60);
    expect(env.RATE_LIMIT_MAX).toBe(120);
  });

  it("accepte la désactivation hors production", () => {
    const env = loadEnv({ ...base, NODE_ENV: "development", RATE_LIMIT_DISABLED: "true" });
    expect(env.RATE_LIMIT_DISABLED).toBe(true);
  });

  it("refuse la désactivation en production", () => {
    expect(() =>
      loadEnv({ ...base, NODE_ENV: "production", RATE_LIMIT_DISABLED: "true" }),
    ).toThrow(/production/i);
  });

  it("lit les bornes personnalisées", () => {
    const env = loadEnv({ ...base, RATE_LIMIT_TTL_SECONDS: "30", RATE_LIMIT_MAX: "1000" });
    expect(env.RATE_LIMIT_TTL_SECONDS).toBe(30);
    expect(env.RATE_LIMIT_MAX).toBe(1000);
  });
});

describe("shouldServeApiDocs", () => {
  it("ouverte hors production par défaut", () => {
    expect(shouldServeApiDocs(loadEnv({ ...base, NODE_ENV: "development" }))).toBe(true);
  });

  it("fermée en production par défaut", () => {
    expect(shouldServeApiDocs(loadEnv({ ...base, ...prodKey, NODE_ENV: "production" }))).toBe(false);
  });

  it("surcharge explicite : ouverte en production si demandé", () => {
    expect(
      shouldServeApiDocs(loadEnv({ ...base, ...prodKey, NODE_ENV: "production", API_DOCS_ENABLED: "true" })),
    ).toBe(true);
  });

  it("surcharge explicite : fermée en dev si demandé", () => {
    expect(
      shouldServeApiDocs(loadEnv({ ...base, NODE_ENV: "development", API_DOCS_ENABLED: "false" })),
    ).toBe(false);
  });
});

describe("canaux de réception (Lot 12)", () => {
  it("exige CHANNEL_SECRET_KEY en production", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/CHANNEL_SECRET_KEY/);
    expect(() => loadEnv({ ...base, ...prodKey, NODE_ENV: "production" })).not.toThrow();
  });

  it("secrets de webhook : valeurs de dev hors production, aucun en production", () => {
    expect(channelWebhookSecrets(loadEnv({ ...base })).twilioToken).toBe("dev-twilio-token");
    const prod = channelWebhookSecrets(loadEnv({ ...base, ...prodKey, NODE_ENV: "production" }));
    expect(prod).toEqual({
      brevoToken: undefined,
      twilioToken: undefined,
      metaAppSecret: undefined,
      metaVerifyToken: undefined,
    });
  });
});
