import { createHmac } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  test,
  expect,
  apiLogin,
  uniqueEmail,
  MAILPIT_URL,
  API_URL,
  type ApiSession,
} from "../fixtures/tando";

const API = `${API_URL}/api/v1`;

/**
 * Lot 12 — Canaux de réception. Chaque fournisseur est simulé au niveau HTTP
 * (charges et signatures identiques aux vraies) ; les envois SMS / WhatsApp sont
 * en mode `fake`, les emails partent réellement vers Mailpit.
 * Secrets de dev : voir `channelWebhookSecrets()` (apps/api/src/config/env.ts).
 */
const BREVO_TOKEN = process.env.BREVO_INBOUND_TOKEN ?? "dev-brevo-inbound";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "dev-twilio-token";
const TWILIO_BASE = process.env.TWILIO_WEBHOOK_BASE_URL ?? API_URL;
const META_SECRET = process.env.META_APP_SECRET ?? "dev-meta-secret";
const META_VERIFY = process.env.META_VERIFY_TOKEN ?? "dev-meta-verify";

const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

async function workingAssistant(api: APIRequestContext, email: string) {
  const s = await apiLogin(api, email);
  const sub = await api.post(`${API}/me/catalog/subscribe`, { headers: s.headers, data: { slug: "dentiste" } });
  expect(sub.ok(), "subscribe").toBeTruthy();
  const { assistantId } = (await sub.json()) as { assistantId: string };
  await api.post(`${API}/me/assistants/${assistantId}/onboarding`, {
    headers: s.headers,
    data: {
      step: 3,
      establishment: { name: "Cabinet Canaux", address: "1 rue du Test", openingHours: "Lun-Ven 9h-18h" },
      contactPrefs: { email, phone: "0600000000", inbox: "email" },
    },
  });
  const act = await api.post(`${API}/me/assistants/${assistantId}/activate`, { headers: s.headers });
  expect(act.ok(), "activate").toBeTruthy();
  return { s, assistantId };
}

async function channels(api: APIRequestContext, s: ApiSession, assistantId: string) {
  const res = await api.get(`${API}/me/assistants/${assistantId}/channels`, { headers: s.headers });
  expect(res.ok(), "channels").toBeTruthy();
  return (await res.json()) as {
    channels: Array<{ kind: string; status: string; display: string }>;
    formUrl: string;
    formSnippet: string;
  };
}

async function logbook(api: APIRequestContext, s: ApiSession, assistantId: string) {
  const res = await api.get(`${API}/me/assistants/${assistantId}`, { headers: s.headers });
  return (await res.json()) as {
    logbook: Array<{ channel: string; summary: string }>;
    escalations: Array<{ id: string; question: string; status: string }>;
  };
}

async function waitForMail(api: APIRequestContext, to: string, match: RegExp, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (await api.get(`${MAILPIT_URL}/api/v1/messages?limit=50`)).json()) as {
      messages: Array<{ ID: string; To: Array<{ Address: string }>; Subject: string }>;
    };
    for (const m of list.messages ?? []) {
      if (!m.To.some((t) => t.Address.toLowerCase() === to)) continue;
      const full = (await (await api.get(`${MAILPIT_URL}/api/v1/message/${m.ID}`)).json()) as { Text?: string };
      if (match.test(full.Text ?? "")) return { subject: m.Subject, text: full.Text ?? "" };
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Aucun email pour ${to} correspondant à ${match}.`);
}

function twilioSign(path: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], `${TWILIO_BASE}${path}`);
  return createHmac("sha1", TWILIO_TOKEN).update(data).digest("base64");
}

async function twilioPost(api: APIRequestContext, path: string, params: Record<string, string>, sig?: string) {
  return api.post(`${API_URL}${path}`, {
    form: params,
    headers: { "X-Twilio-Signature": sig ?? twilioSign(path, params) },
  });
}

test.describe("canaux de réception", () => {
  test("canaux par défaut, formulaire public et cloisonnement", async ({ api, page, playwright }) => {
    const { s, assistantId } = await workingAssistant(api, uniqueEmail("canaux-form"));
    const view = await channels(api, s, assistantId);
    expect(view.channels.map((c) => c.kind).sort()).toEqual(["email", "formulaire"]);
    expect(view.channels.find((c) => c.kind === "email")?.display).toMatch(/^cabinet-canaux-[0-9a-f]{4}@/);
    expect(view.formSnippet).toContain(view.formUrl);

    // Un autre client ne voit pas ces canaux.
    const other = await apiLogin(api, uniqueEmail("canaux-intrus"));
    const peek = await api.get(`${API}/me/assistants/${assistantId}/channels`, { headers: other.headers });
    expect(peek.status()).toBe(404);

    // Le formulaire répond directement (question courante).
    const publicId = view.formUrl.split("/").pop()!;
    const anon = await playwright.request.newContext();
    const r = await anon.post(`${API}/channels/form/${publicId}`, {
      data: { text: "Quels sont vos horaires ?", name: "Léa" },
    });
    expect(r.ok()).toBeTruthy();
    const body = (await r.json()) as { reply: string | null; sessionId: string; status: string };
    expect(body.status).toBe("handled");
    expect(body.reply).toBeTruthy();
    await anon.dispose();

    // La page publique s'affiche dans un cadre, sans l'habillage du site.
    const resp = await page.goto(`/formulaire/${publicId}`);
    expect(resp?.headers()["x-frame-options"]).toBeUndefined();
    expect(resp?.headers()["content-security-policy"]).toContain("frame-ancestors *");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cabinet Canaux");
    await page.getByLabel("Votre message").fill("Je voudrais un rendez-vous jeudi à 14h");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(/jeudi|rendez-vous|créneau/i).last()).toBeVisible();

    // Les autres pages restent interdites de cadrage.
    const home = await page.goto("/");
    expect(home?.headers()["x-frame-options"]).toBe("DENY");
  });

  test("email : réception Brevo, réponse dans le fil, relais de la réponse du patron", async ({ api }) => {
    const { s, assistantId } = await workingAssistant(api, uniqueEmail("canaux-mail"));
    const inbox = (await channels(api, s, assistantId)).channels.find((c) => c.kind === "email")!.display;
    const customer = uniqueEmail("client-mail").toLowerCase();

    const email = (id: string, text: string) => ({
      items: [
        {
          Uuid: [id],
          MessageId: `<${id}@client.example>`,
          From: { Name: "Paul Durand", Address: customer },
          To: [{ Address: inbox.toUpperCase() }],
          Subject: "Question",
          RawTextBody: text,
          ExtractedMarkdownMessage: text,
          Headers: {},
          SpamScore: 0,
        },
      ],
    });

    const denied = await api.post(`${API}/channels/email/brevo?token=mauvais`, { data: email("x", "x") });
    expect(denied.status()).toBe(403);

    const id = `m${Date.now()}`;
    const ok = await api.post(`${API}/channels/email/brevo?token=${BREVO_TOKEN}`, {
      data: email(id, "Bonjour, quels sont vos horaires ?"),
    });
    expect(await ok.json()).toEqual({ handled: 1 });
    // Rejeu du même email : ignoré.
    const replay = await api.post(`${API}/channels/email/brevo?token=${BREVO_TOKEN}`, {
      data: email(id, "Bonjour, quels sont vos horaires ?"),
    });
    expect(await replay.json()).toEqual({ handled: 0 });

    const reply = await waitForMail(api, customer, /Cabinet Canaux/);
    expect(reply.subject).toBe("Re: Question");

    // Question de prix → remontée au patron ; sa réponse repart par email.
    await api.post(`${API}/channels/email/brevo?token=${BREVO_TOKEN}`, {
      data: email(`p${Date.now()}`, "Combien coûte un détartrage ?"),
    });
    const esc = (await logbook(api, s, assistantId)).escalations.find((e) => e.status === "ouverte");
    expect(esc, "escalade ouverte").toBeTruthy();
    const answered = await api.post(`${API}/me/escalations/${esc!.id}/answer`, {
      headers: s.headers,
      data: { answer: "Le détartrage est à 28,92 €, remboursé par la Sécurité sociale." },
    });
    expect(answered.ok()).toBeTruthy();
    await waitForMail(api, customer, /28,92/);
  });

  test("SMS et appels manqués (Twilio), WhatsApp (Meta) — raccordés par le back-office", async ({ api }) => {
    const { s, assistantId } = await workingAssistant(api, uniqueEmail("canaux-tel"));
    const staff = await apiLogin(api, "staff@tando.fr");
    const number = `+331${digits(8)}`;
    const phoneNumberId = digits(15);

    for (const data of [
      { kind: "sms", address: number },
      { kind: "telephone", address: number },
      { kind: "whatsapp", address: phoneNumberId, display: "01 00 00 00 00", accessToken: "EAAG-test" },
    ]) {
      const res = await api.post(`${API}/admin/assistants/${assistantId}/channels`, {
        headers: staff.headers,
        data,
      });
      expect(res.ok(), `raccordement ${data.kind}`).toBeTruthy();
    }
    // Un client ne peut pas raccorder de canal lui-même.
    const forbidden = await api.post(`${API}/admin/assistants/${assistantId}/channels`, {
      headers: s.headers,
      data: { kind: "sms", address: `+331${digits(8)}` },
    });
    expect(forbidden.status()).toBe(403);

    // Le patron voit son numéro, formaté.
    const view = await channels(api, s, assistantId);
    expect(view.channels.find((c) => c.kind === "sms")?.display).toMatch(/^01 /);

    // SMS signé → traité ; signature fausse → refusé.
    const caller = `+336${digits(8)}`;
    const sms = { To: number, From: caller, Body: "Bonjour, vous êtes ouverts samedi ?", MessageSid: `SM${digits(10)}` };
    expect((await twilioPost(api, "/api/v1/channels/twilio/sms", sms, "faux")).status()).toBe(403);
    const smsRes = await twilioPost(api, "/api/v1/channels/twilio/sms", sms);
    expect(smsRes.status()).toBe(200);
    expect(await smsRes.text()).toContain("<Response>");

    // Appel manqué : message vocal + SMS de reprise par écrit.
    const call = { To: number, From: `+337${digits(8)}`, CallSid: `CA${digits(10)}` };
    const voice = await twilioPost(api, "/api/v1/channels/twilio/voice", call);
    const twiml = await voice.text();
    expect(twiml).toContain('<Say language="fr-FR"');
    expect(twiml).toContain("SMS");

    // WhatsApp : vérification d'abonnement puis message signé.
    const challenge = await api.get(
      `${API}/channels/meta?hub.mode=subscribe&hub.verify_token=${META_VERIFY}&hub.challenge=42`,
    );
    expect(await challenge.text()).toBe("42");
    const wa = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: phoneNumberId },
                contacts: [{ wa_id: "33611111111", profile: { name: "Inès" } }],
                messages: [{ from: "33611111111", id: `wamid.${digits(12)}`, type: "text", text: { body: "Quelle est votre adresse ?" } }],
              },
            },
          ],
        },
      ],
    });
    const sig = `sha256=${createHmac("sha256", META_SECRET).update(wa).digest("hex")}`;
    const bad = await api.post(`${API}/channels/meta`, {
      data: wa,
      headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=00" },
    });
    expect(bad.status()).toBe(403);
    const good = await api.post(`${API}/channels/meta`, {
      data: wa,
      headers: { "content-type": "application/json", "x-hub-signature-256": sig },
    });
    expect(good.ok()).toBeTruthy();

    // Tout est consigné dans le carnet de bord.
    const book = await logbook(api, s, assistantId);
    const kinds = book.logbook.map((e) => e.channel);
    expect(kinds).toEqual(expect.arrayContaining(["sms", "telephone", "whatsapp"]));
    expect(book.logbook.find((e) => e.channel === "telephone")?.summary).toMatch(/appel manqué/i);
  });
});
