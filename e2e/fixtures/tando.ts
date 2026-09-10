import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://localhost:3333";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

const API = `${API_URL}/api/v1`;

/** Adresse jetable et unique par test (isolation : un email = une organisation). */
export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@e2e.tando.local`;
}

interface MailpitMessage {
  ID: string;
  To: Array<{ Address: string }>;
}

async function messageIdsFor(api: APIRequestContext, email: string): Promise<string[]> {
  const list = await api.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
  const { messages = [] } = (await list.json()) as { messages: MailpitMessage[] };
  return messages
    .filter((m) => (m.To ?? []).some((t) => t.Address.toLowerCase() === email.toLowerCase()))
    .map((m) => m.ID);
}

async function tokenFromMessage(api: APIRequestContext, id: string): Promise<string> {
  const raw = await (await api.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
  const body = `${raw.HTML ?? ""} ${raw.Text ?? ""}`.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
  const m = body.match(/[?&]token=([A-Za-z0-9_\-.]+)/);
  if (m?.[1]) return m[1];
  throw new Error(`Mail ${id} sans jeton dans le corps.`);
}

/**
 * Demande un lien magique pour `email` et renvoie le jeton du mail QUI VIENT
 * D'ARRIVER (ignore les liens déjà présents, potentiellement déjà consommés).
 */
export async function requestMagicToken(
  api: APIRequestContext,
  email: string,
  { channel = "web", timeoutMs = 15_000 }: { channel?: "web" | "mobile"; timeoutMs?: number } = {},
): Promise<string> {
  const before = new Set(await messageIdsFor(api, email));
  const req = await api.post(`${API}/auth/magic-link`, { data: { email, channel } });
  expect(req.ok(), `magic-link ${email}`).toBeTruthy();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const fresh = (await messageIdsFor(api, email)).find((id) => !before.has(id));
    if (fresh) return tokenFromMessage(api, fresh);
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Aucun nouveau lien magique pour ${email} après ${timeoutMs} ms.`);
}

export interface ApiSession {
  token: string;
  user: { id: string; email: string; organizationId: string; role: string };
  /** Raccourci : en-tête Authorization prêt à l'emploi. */
  headers: { Authorization: string };
}

/** Connexion niveau API : renvoie un jeton Bearer (mobile / appels directs). */
export async function apiLogin(api: APIRequestContext, email: string): Promise<ApiSession> {
  const token = await requestMagicToken(api, email);
  const res = await api.post(`${API}/auth/verify`, { data: { token } });
  expect(res.ok(), `verify ${email}`).toBeTruthy();

  const body = (await res.json()) as { token: string; user: ApiSession["user"] };
  return {
    token: body.token,
    user: body.user,
    headers: { Authorization: `Bearer ${body.token}` },
  };
}

/** Connexion niveau navigateur : pose le cookie de session httpOnly du site. */
export async function webLogin(page: Page, api: APIRequestContext, email: string): Promise<void> {
  const token = await requestMagicToken(api, email);
  await page.goto(`/connexion/verifier?token=${token}`);
  await expect(page).toHaveURL(/\/mon-equipe/);
}

export const test = base.extend<{
  /** Contexte de requêtes vers l'API (indépendant du navigateur). */
  api: APIRequestContext;
}>({
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect };
