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

/** Récupère le jeton du lien de devis (`/devis/<number>?token=`) dans le mail « devis prêt ». */
export async function quoteTokenFromMail(
  api: APIRequestContext,
  email: string,
  number: string,
): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const list = await api.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    const { messages = [] } = (await list.json()) as {
      messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }>;
    };
    const hit = messages.find(
      (m) =>
        m.Subject?.includes(number) &&
        (m.To ?? []).some((t) => t.Address.toLowerCase() === email.toLowerCase()),
    );
    if (hit) return tokenFromMessage(api, hit.ID);
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Pas de mail « devis ${number} » pour ${email}.`);
}

/** Questionnaire rempli puis envoyé : renvoie le numéro du devis généré. */
export async function submitAssessment(api: APIRequestContext, email: string): Promise<string> {
  const start = await api.post(`${API}/assessments`, { data: { email } });
  expect(start.ok(), "POST /assessments").toBeTruthy();
  const { resumeToken } = (await start.json()) as { resumeToken: string };
  const anon = { headers: { Authorization: `Bearer ${resumeToken}` } };

  const patch = await api.patch(`${API}/assessments/current`, {
    ...anon,
    data: {
      answers: {
        entreprise: "Entreprise E2E",
        nom: "Camille Test",
        secteur: "restaurant",
        taches: ["reserver", "questions"],
        canaux: ["telephone", "email"],
        agenda: "google",
        heures: "ouverture",
        ton: "chaleureux",
      },
    },
  });
  expect(patch.ok(), "PATCH /assessments/current").toBeTruthy();

  const preview = await api.get(`${API}/assessments/current/preview`, anon);
  expect(preview.ok(), "preview").toBeTruthy();
  const submit = await api.post(`${API}/assessments/current/submit`, {
    ...anon,
    data: { jobDescription: await preview.json() },
  });
  expect(submit.ok(), "submit").toBeTruthy();
  return ((await submit.json()) as { quoteNumber: string }).quoteNumber;
}

/** Le back-office relit puis envoie le devis (jamais automatique). */
export async function staffSendsQuote(api: APIRequestContext, quoteNumber: string): Promise<void> {
  const staff = await apiLogin(api, "staff@tando.fr");
  const quotes = await api.get(`${API}/admin/quotes`, { headers: staff.headers });
  const list = (await quotes.json()).quotes as Array<{ id: string; number: string }>;
  const quote = list.find((q) => q.number === quoteNumber);
  expect(quote, `devis ${quoteNumber} dans le back-office`).toBeTruthy();
  const send = await api.post(`${API}/admin/quotes/${quote!.id}/send`, { headers: staff.headers });
  expect(send.ok(), "POST /admin/quotes/:id/send").toBeTruthy();
}

/**
 * Seul chemin d'embauche : besoin → devis envoyé → acceptation. Crée le compte
 * client ; son employé virtuel apparaît à la première lecture de l'équipe.
 */
export async function hireViaQuote(
  api: APIRequestContext,
  email: string,
): Promise<{ session: ApiSession; assistantId: string }> {
  const quoteNumber = await submitAssessment(api, email);
  await staffSendsQuote(api, quoteNumber);
  const token = await quoteTokenFromMail(api, email, quoteNumber);
  const accept = await api.post(`${API}/quotes/${quoteNumber}/accept?token=${token}`, {
    data: { name: "Camille Test", cgv: true },
  });
  expect(accept.ok(), "acceptation du devis").toBeTruthy();

  const session = await apiLogin(api, email);
  const team = await api.get(`${API}/me/team`, { headers: session.headers });
  expect(team.ok(), "GET /me/team").toBeTruthy();
  const { assistants } = (await team.json()) as { assistants: Array<{ id: string }> };
  const assistantId = assistants[0]?.id;
  expect(assistantId, "employé virtuel créé depuis la mission").toBeTruthy();
  return { session, assistantId: assistantId! };
}

/** Termine le « premier jour » et met l'employé au travail. */
export async function activateAssistant(
  api: APIRequestContext,
  session: ApiSession,
  assistantId: string,
): Promise<void> {
  const onboarding = await api.post(`${API}/me/assistants/${assistantId}/onboarding`, {
    headers: session.headers,
    data: {
      step: 3,
      establishment: { name: "Établissement E2E", address: "1 rue du Test", openingHours: "Lun-Ven 9h-18h" },
      contactPrefs: { email: session.user.email, phone: "0600000000", inbox: "email" },
    },
  });
  expect(onboarding.ok(), "onboarding").toBeTruthy();
  const act = await api.post(`${API}/me/assistants/${assistantId}/activate`, { headers: session.headers });
  expect(act.ok(), "activate").toBeTruthy();
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
