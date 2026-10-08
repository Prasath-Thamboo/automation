import { hmacBase64, safeEqual } from "../webhook-auth";

/**
 * Twilio (Lot 12) — SMS et appels. Fonctions pures : signature des webhooks,
 * réponses TwiML, numéros. Pas de SDK : deux appels HTTP suffisent.
 */

/**
 * Signature `X-Twilio-Signature` : HMAC-SHA1 (jeton du compte) de l'URL
 * complète appelée, suivie des paramètres POST triés (clé + valeur), en base64.
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + (params[key] ?? ""), url);
  return hmacBase64("sha1", authToken, data);
}

export function verifyTwilioSignature(
  authToken: string | undefined,
  url: string,
  params: Record<string, string>,
  signature: string | undefined,
): boolean {
  if (!authToken) return false;
  return safeEqual(signature, twilioSignature(authToken, url, params));
}

/** Ne garde que les paramètres texte du corps (form-urlencoded). */
export function stringParams(body: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (body && typeof body === "object") {
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  return out;
}

// ── TwiML ────────────────────────────────────────────────────────────────

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

/** Fait sonner le patron ; sans réponse, Twilio rappelle `action`. */
export function dialTwiml(forwardTo: string, callerId: string, action: string, timeoutSec = 20): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Dial timeout="${timeoutSec}" action="${xml(action)}" method="POST" callerId="${xml(callerId)}">` +
    `<Number>${xml(forwardTo)}</Number></Dial></Response>`
  );
}

/** Message vocal puis raccroché. */
export function sayTwiml(message: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Say language="fr-FR" voice="Polly.Lea">${xml(message)}</Say><Hangup/></Response>`
  );
}

// ── Numéros ─────────────────────────────────────────────────────────────

/** Numéro E.164 plausible (les appels masqués arrivent en « anonymous », « +266696687 »…). */
export function isCallableNumber(n: string | undefined): n is string {
  return Boolean(n && /^\+[1-9]\d{7,14}$/.test(n) && n !== "+266696687");
}

/** Peut recevoir un SMS : en France, seulement les mobiles (06 / 07). */
export function canReceiveSms(n: string | undefined): n is string {
  if (!isCallableNumber(n)) return false;
  if (n.startsWith("+33")) return /^\+33[67]\d{8}$/.test(n);
  return true;
}

/** « 06 12 34 56 78 », « +33 6 12… », « 0033… » → « +33612345678 ». `null` si illisible. */
export function toE164(input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, "");
  let n = compact;
  if (/^00\d+$/.test(n)) n = `+${n.slice(2)}`;
  else if (/^0[1-9]\d{8}$/.test(n)) n = `+33${n.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/** Mots-clés de désinscription : on n'y répond jamais. */
export function isOptOut(body: string): boolean {
  return /^\s*(stop|arr[eê]t|unsubscribe|desinscription|désinscription)\s*$/i.test(body);
}
