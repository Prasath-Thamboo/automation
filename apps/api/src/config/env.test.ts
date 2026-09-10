import { describe, expect, it } from "vitest";
import { loadEnv, shouldServeApiDocs } from "./env";

const base = {
  DATABASE_URL: "postgresql://tando:tando@localhost:5432/tando?schema=public",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "x".repeat(32),
};

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
    expect(shouldServeApiDocs(loadEnv({ ...base, NODE_ENV: "production" }))).toBe(false);
  });

  it("surcharge explicite : ouverte en production si demandé", () => {
    expect(
      shouldServeApiDocs(loadEnv({ ...base, NODE_ENV: "production", API_DOCS_ENABLED: "true" })),
    ).toBe(true);
  });

  it("surcharge explicite : fermée en dev si demandé", () => {
    expect(
      shouldServeApiDocs(loadEnv({ ...base, NODE_ENV: "development", API_DOCS_ENABLED: "false" })),
    ).toBe(false);
  });
});
