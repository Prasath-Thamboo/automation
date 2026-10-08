import { hmacHex, safeEqual } from "../webhook-auth";

/**
 * Meta (Lot 12) — WhatsApp Business (Cloud) et Instagram. Un seul webhook pour
 * l'application Meta ; fonctions pures, testées unitairement.
 */

/** `X-Hub-Signature-256: sha256=<hex>` — HMAC-SHA256 du corps brut avec le secret de l'app. */
export function verifyMetaSignature(
  appSecret: string | undefined,
  rawBody: string,
  header: string | undefined,
): boolean {
  if (!appSecret || !header) return false;
  return safeEqual(header, `sha256=${hmacHex("sha256", appSecret, rawBody)}`);
}

export interface MetaInbound {
  kind: "whatsapp" | "instagram";
  /** Identifiant du point d'arrivée : phone_number_id (WhatsApp), id du compte (Instagram). */
  address: string;
  /** Identifiant de l'expéditeur côté Meta (wa_id, IGSID) — sert aussi à répondre. */
  from: string;
  firstName: string | null;
  /** Identifiant du message (dédoublonnage). */
  eventId: string;
  text: string;
}

/** Ce qu'on transmet quand le client envoie autre chose que du texte. */
export const ATTACHMENT_TEXT =
  "Le client a envoyé une pièce jointe (photo, message vocal ou fichier) que je ne peux pas lire.";

const MAX_TEXT = 4000;

/** Extrait les messages entrants ; ignore accusés de lecture, statuts et échos. */
export function parseMetaWebhook(payload: unknown): MetaInbound[] {
  const p = payload as { object?: string; entry?: unknown[] } | null;
  if (!p || !Array.isArray(p.entry)) return [];
  if (p.object === "whatsapp_business_account") return p.entry.flatMap(readWhatsAppEntry);
  if (p.object === "instagram") return p.entry.flatMap(readInstagramEntry);
  return [];
}

interface WaMessage {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

function readWhatsAppEntry(entry: unknown): MetaInbound[] {
  const changes = (entry as { changes?: unknown[] }).changes ?? [];
  const out: MetaInbound[] = [];
  for (const change of changes as Array<{ field?: string; value?: Record<string, unknown> }>) {
    if (change.field !== "messages" || !change.value) continue;
    const value = change.value as {
      metadata?: { phone_number_id?: string };
      contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      messages?: WaMessage[];
    };
    const address = value.metadata?.phone_number_id;
    if (!address) continue;
    for (const m of value.messages ?? []) {
      if (!m.from || !m.id) continue;
      const contact = value.contacts?.find((c) => c.wa_id === m.from) ?? value.contacts?.[0];
      const text =
        m.type === "text"
          ? (m.text?.body ?? "")
          : m.type === "button"
            ? (m.button?.text ?? "")
            : m.type === "interactive"
              ? (m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "")
              : ATTACHMENT_TEXT;
      if (!text.trim()) continue;
      out.push({
        kind: "whatsapp",
        address,
        from: m.from,
        firstName: firstWord(contact?.profile?.name),
        eventId: m.id,
        text: text.trim().slice(0, MAX_TEXT),
      });
    }
  }
  return out;
}

interface IgMessaging {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean; attachments?: unknown[] };
}

function readInstagramEntry(entry: unknown): MetaInbound[] {
  const e = entry as { id?: string; messaging?: IgMessaging[] };
  const out: MetaInbound[] = [];
  for (const ev of e.messaging ?? []) {
    const msg = ev.message;
    if (!msg?.mid || msg.is_echo || msg.is_deleted) continue;
    const from = ev.sender?.id;
    const address = ev.recipient?.id ?? e.id;
    if (!from || !address || from === address) continue;
    const text = msg.text?.trim() || (msg.attachments?.length ? ATTACHMENT_TEXT : "");
    if (!text) continue;
    out.push({
      kind: "instagram",
      address,
      from,
      firstName: null,
      eventId: msg.mid,
      text: text.slice(0, MAX_TEXT),
    });
  }
  return out;
}

function firstWord(name: string | undefined): string | null {
  const w = (name ?? "").trim().split(/\s+/)[0];
  return w ? w.slice(0, 40) : null;
}
