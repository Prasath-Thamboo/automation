import { request } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:3333";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

/**
 * Échoue vite et clairement si un service manque, plutôt que de laisser chaque
 * test tomber en timeout.
 */
export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext();

  const checks: Array<[string, string]> = [
    ["API", `${API_URL}/api/v1/health`],
    ["Mailpit", `${MAILPIT_URL}/api/v1/messages?limit=1`],
  ];

  for (const [name, url] of checks) {
    try {
      const res = await ctx.get(url, { timeout: 5_000 });
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    } catch (err) {
      await ctx.dispose();
      throw new Error(
        `[e2e] ${name} injoignable sur ${url} (${(err as Error).message}).\n` +
          `Lance la pile : pnpm db:up puis l'API et le web (ou pnpm dev).`,
      );
    }
  }

  const health = await (await ctx.get(`${API_URL}/api/v1/health`)).json();
  if (health?.checks?.database !== "ok" || health?.checks?.redis !== "ok") {
    await ctx.dispose();
    throw new Error(`[e2e] santé API dégradée : ${JSON.stringify(health?.checks)}`);
  }

  await ctx.dispose();
}
