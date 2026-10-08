import { normalizeEmail } from "../email-address";

/**
 * Lecture du webhook « Inbound parsing » de Brevo (Lot 12). Brevo poste un
 * lot d'emails reçus sur le domaine de réception (MX → Brevo). Fonctions
 * pures, sans accès réseau ni base : testées unitairement.
 */

interface BrevoAddress {
  Name?: string | null;
  Address?: string | null;
}

interface BrevoItem {
  Uuid?: string[] | string;
  MessageId?: string | null;
  InReplyTo?: string | null;
  From?: BrevoAddress | null;
  To?: BrevoAddress[] | null;
  Cc?: BrevoAddress[] | null;
  ReplyTo?: BrevoAddress | null;
  Subject?: string | null;
  RawTextBody?: string | null;
  ExtractedMarkdownMessage?: string | null;
  Headers?: Record<string, string | string[]> | null;
  SpamScore?: number | null;
}

export interface InboundEmail {
  /** Identifiant unique de l'email (dédoublonnage). */
  eventId: string;
  /** Adresses de réception visées (To + Cc), normalisées. */
  recipients: string[];
  /** Expéditeur à qui répondre (Reply-To sinon From), normalisé. */
  replyTo: string;
  /** Prénom de l'expéditeur, s'il l'a donné. */
  firstName: string | null;
  subject: string;
  messageId: string | null;
  /** Corps sans l'historique cité ni la signature. */
  text: string;
}

export type SkipReason = "automatique" | "indesirable" | "vide" | "boucle" | "invalide";

/** Au-delà, Brevo considère l'email comme indésirable. */
const SPAM_THRESHOLD = 5;
const MAX_TEXT = 4000;

/** Extrait les emails exploitables du lot ; les autres sont ignorés avec leur raison. */
export function parseBrevoInbound(
  payload: unknown,
  ownDomains: string[],
): { emails: InboundEmail[]; skipped: SkipReason[] } {
  const items = (payload as { items?: unknown } | null)?.items;
  const emails: InboundEmail[] = [];
  const skipped: SkipReason[] = [];
  if (!Array.isArray(items)) return { emails, skipped };

  const own = ownDomains.map((d) => d.toLowerCase());
  for (const raw of items as BrevoItem[]) {
    const result = readItem(raw, own);
    if (typeof result === "string") skipped.push(result);
    else emails.push(result);
  }
  return { emails, skipped };
}

function readItem(item: BrevoItem, ownDomains: string[]): InboundEmail | SkipReason {
  const from = item.From?.Address ? normalizeEmail(item.From.Address) : null;
  const replyTo = item.ReplyTo?.Address ? normalizeEmail(item.ReplyTo.Address) : from;
  const eventId = item.MessageId || (Array.isArray(item.Uuid) ? item.Uuid[0] : item.Uuid);
  if (!from || !replyTo || !eventId) return "invalide";

  // Jamais de conversation avec nous-mêmes (réponse automatique, rebond…).
  if (ownDomains.some((d) => replyTo.endsWith(`@${d}`))) return "boucle";
  if (isAutomatic(item.Headers ?? {}, from)) return "automatique";
  if ((item.SpamScore ?? 0) > SPAM_THRESHOLD) return "indesirable";

  const text = (item.ExtractedMarkdownMessage || stripQuoted(item.RawTextBody ?? ""))
    .trim()
    .slice(0, MAX_TEXT);
  if (!text) return "vide";

  const recipients = [...(item.To ?? []), ...(item.Cc ?? [])]
    .map((a) => (a.Address ? normalizeEmail(a.Address) : ""))
    .filter(Boolean);

  const firstName = (item.From?.Name ?? "").trim().split(/\s+/)[0] || null;
  return {
    eventId,
    recipients,
    replyTo,
    firstName: firstName && !firstName.includes("@") ? firstName.slice(0, 40) : null,
    subject: (item.Subject ?? "").trim().slice(0, 200),
    messageId: item.MessageId ?? null,
    text,
  };
}

function header(headers: Record<string, string | string[]>, name: string): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  const v = key ? headers[key] : undefined;
  return (Array.isArray(v) ? v.join(",") : (v ?? "")).toLowerCase();
}

/** Réponses automatiques, listes de diffusion, rebonds : on ne répond pas. */
function isAutomatic(headers: Record<string, string | string[]>, from: string): boolean {
  const autoSubmitted = header(headers, "auto-submitted");
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (/^(bulk|junk|list|auto_reply)$/.test(header(headers, "precedence"))) return true;
  if (header(headers, "x-autoreply") || header(headers, "x-autorespond")) return true;
  if (header(headers, "list-id") || header(headers, "list-unsubscribe")) return true;
  return /^(mailer-daemon|postmaster|no-?reply|ne-?pas-?repondre)@/.test(from);
}

/** Repli quand Brevo n'a pas extrait le message : coupe l'historique cité. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^(le|on) .+(a écrit|wrote)\s*:\s*$/i.test(line.trim())) break;
    if (/^-{2,}\s*(original message|message d'origine)/i.test(line.trim())) break;
    out.push(line);
  }
  return out.join("\n");
}
