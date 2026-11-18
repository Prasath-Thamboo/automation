/**
 * Briques communes aux flux métier. Ce fichier est recopié tel quel (après
 * compilation) dans le nœud Code de chaque flux n8n : il ne doit RIEN importer
 * à l'exécution, et n'utiliser que ce qu'offre Node (Intl compris).
 *
 * Le contrat (corps reçu, réponses possibles) est celui de
 * `docs/n8n/README.md` et de `apps/api/src/assistants/runtime/n8n.runtime.ts`.
 */

// ── Contrat ──────────────────────────────────────────────────────────────────

export interface FlowRequest {
  version: number;
  channel: string;
  text: string;
  assistant: {
    id: string;
    name: string;
    role: string;
    professionSlug: string | null;
    workflowScope: "client" | "metier" | null;
    jobDescription: { summary?: string; tasks?: string[]; hours?: string; limits?: string[]; tone?: string };
    establishment: { name?: string; address?: string; openingHours?: string };
    specifics: Record<string, string>;
  };
  instructions: string[];
  switches: Record<string, boolean>;
  history: Array<{ author: "client" | "assistant" | "patron"; text: string }>;
}

export type FlowReply =
  | { kind: "reply"; text: string; capability: string; summary: string }
  | { kind: "escalate"; question: string; context: string; ackText: string; summary: string }
  | {
      kind: "appointment";
      text: string;
      summary: string;
      slotISO: string | null;
      status: "propose" | "confirme";
    };

const MAX_TEXT = 1600;
const MAX_SUMMARY = 300;

export function reply(text: string, summary: string, capability = "questions"): FlowReply {
  return { kind: "reply", text: cut(text, MAX_TEXT), capability, summary: cut(summary, MAX_SUMMARY) };
}

export function escalate(question: string, context: string, ackText: string, summary: string): FlowReply {
  return {
    kind: "escalate",
    question: cut(question, MAX_TEXT),
    context: cut(context, MAX_TEXT),
    ackText: cut(ackText, MAX_TEXT),
    summary: cut(summary, MAX_SUMMARY),
  };
}

export function appointment(
  text: string,
  summary: string,
  slotISO: string | null,
  status: "propose" | "confirme" = "propose",
): FlowReply {
  return { kind: "appointment", text: cut(text, MAX_TEXT), summary: cut(summary, MAX_SUMMARY), slotISO, status };
}

/** Un bouton absent est considéré allumé : seul `false` coupe une capacité. */
export function switchOn(req: FlowRequest, key: string): boolean {
  return req.switches?.[key] !== false;
}

/** Vrai si le corps reçu a la forme attendue (version 2 du contrat). */
export function isValidRequest(req: unknown): req is FlowRequest {
  if (!req || typeof req !== "object") return false;
  const r = req as Partial<FlowRequest>;
  return (
    r.version === 2 &&
    typeof r.text === "string" &&
    r.text.trim().length > 0 &&
    !!r.assistant &&
    typeof r.assistant === "object"
  );
}

// ── Texte ────────────────────────────────────────────────────────────────────

/** Minuscules, sans accents ; apostrophes et traits d'union deviennent des espaces. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vrai si le texte (déjà normalisé) contient l'un des mots ou expressions en
 * début de mot : « douloureu » couvre « douloureuse », « bus » ne se
 * déclenche pas sur « abus ».
 */
export function has(t: string, words: readonly string[]): boolean {
  return words.some((w) => {
    const i = t.indexOf(w);
    if (i < 0) return false;
    for (let at = i; at >= 0; at = t.indexOf(w, at + 1)) {
      if (at === 0 || !/[a-z0-9]/.test(t[at - 1]!)) return true;
    }
    return false;
  });
}

export function cut(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function clip(s: string): string {
  return cut(s.replace(/\s+/g, " "), 180);
}

export function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Oui / non tels que saisis au « premier jour ». null si non renseigné. */
export function yesNo(v: string | undefined): boolean | null {
  const t = norm(v ?? "");
  if (["oui", "yes", "true", "1"].includes(t)) return true;
  if (["non", "no", "false", "0"].includes(t)) return false;
  return null;
}

/** Valeur d'une spécificité dont la clé contient l'un des mots donnés. */
export function pickSpecific(specifics: Record<string, string>, keys: readonly string[]): string | null {
  for (const [k, v] of Object.entries(specifics ?? {})) {
    if (typeof v === "string" && v.trim() && keys.some((key) => norm(k).includes(key))) return v.trim();
  }
  return null;
}

/** Découpe une liste saisie librement (« Dr Martin, Dr Roy » ou une par ligne). */
export function splitList(v: string | null | undefined): string[] {
  return (v ?? "")
    .split(/[\n,;•]+|\s+et\s+/)
    .map((s) => s.trim().replace(/^[-*]\s*/, ""))
    .filter((s) => s.length > 1);
}

const STOPWORDS = new Set([
  "quand", "pour", "avec", "dans", "cette", "vous", "nous", "elle", "leur", "leurs", "sont",
  "faire", "demande", "demandent", "repond", "reponds", "repondre", "toujours", "jamais",
  "client", "clients", "patient", "patients", "bonjour", "merci", "est", "votre", "notre",
]);

/** Consigne du patron qui partage au moins deux mots porteurs avec le message. */
export function matchInstruction(instructions: readonly string[], message: string): string | null {
  const msg = norm(message);
  for (const instruction of instructions ?? []) {
    const words = [
      ...new Set(
        norm(instruction)
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
      ),
    ];
    if (words.filter((w) => msg.includes(w)).length >= 2) return instruction;
  }
  return null;
}

// ── Dates (heure de Paris) ───────────────────────────────────────────────────

const PARIS = "Europe/Paris";
export const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const FR_MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];
const FR_MONTHS_LABEL = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export interface Ymd {
  y: number;
  /** 1 à 12. */
  m: number;
  d: number;
}

export interface Slot {
  day: Ymd | null;
  time: { h: number; min: number } | null;
  part: "matin" | "apres-midi" | "soir" | null;
}

export function parisParts(date: Date): Ymd & { h: number; min: number } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(date)) p[part.type] = part.value;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), min: Number(p.minute) };
}

/** Heure locale de Paris → instant ISO (UTC), changements d'heure compris. */
export function parisToISO(day: Ymd, h: number, min: number): string {
  const guess = Date.UTC(day.y, day.m - 1, day.d, h, min);
  const p = parisParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return new Date(guess - offset).toISOString();
}

export function addDays(day: Ymd, n: number): Ymd {
  const t = new Date(Date.UTC(day.y, day.m - 1, day.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function weekdayOf(day: Ymd): number {
  return new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
}

function cmpDay(a: Ymd, b: Ymd): number {
  return Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d);
}

/** « jeudi 20 novembre » */
export function humanDay(day: Ymd): string {
  return `${FR_DAYS[weekdayOf(day)]} ${day.d === 1 ? "1er" : day.d} ${FR_MONTHS_LABEL[day.m - 1]}`;
}

/** « 9h », « 14h30 » */
export function humanTime(time: { h: number; min: number }): string {
  return `${time.h}h${time.min ? String(time.min).padStart(2, "0") : ""}`;
}

/** Repère un jour, une heure et un moment de la journée (heure de Paris). */
export function parseSlot(text: string, now: Date): Slot {
  const t = norm(text);
  const nowP = parisParts(now);
  const today: Ymd = { y: nowP.y, m: nowP.m, d: nowP.d };

  let part: Slot["part"] = null;
  if (/\b(apres midi|aprem|cet apres midi)\b/.test(t)) part = "apres-midi";
  else if (/\b(matin|matinee)\b/.test(t)) part = "matin";
  else if (/\b(soir|soiree|fin de journee)\b/.test(t)) part = "soir";

  // Jour : date explicite d'abord, puis mots relatifs, puis jour de semaine.
  let day: Ymd | null = null;
  const withYear = (d: number, m: number): Ymd | null => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const candidate = { y: today.y, m, d };
    return cmpDay(candidate, today) < 0 ? { y: today.y + 1, m, d } : candidate;
  };
  const numeric = t.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  const named = t.match(
    new RegExp(`\\b(1er|\\d{1,2})\\s+(${FR_MONTHS.join("|")})\\b`),
  );
  const bare = t.match(/\b(?:le|du|ce)\s+(1er|\d{1,2})\b(?!\s*(?:h|heures?|:|\/|\d))/);
  if (numeric) {
    day = withYear(Number(numeric[1]), Number(numeric[2]));
  } else if (named) {
    day = withYear(named[1] === "1er" ? 1 : Number(named[1]), FR_MONTHS.indexOf(named[2]!) + 1);
  } else if (/\bapres demain\b/.test(t)) {
    day = addDays(today, 2);
  } else if (/\bdemain\b/.test(t)) {
    day = addDays(today, 1);
  } else if (/\b(aujourd hui|ce matin|ce midi|ce soir|cet apres midi|tout a l heure)\b/.test(t)) {
    day = today;
  } else {
    const idx = FR_DAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(t));
    if (idx >= 0) {
      let delta = (idx - weekdayOf(today) + 7) % 7;
      if (delta === 0) delta = 7;
      day = addDays(today, delta);
    } else if (bare) {
      const d = bare[1] === "1er" ? 1 : Number(bare[1]);
      // « le 3 » : ce mois-ci, ou le mois suivant si la date est passée.
      const thisMonth = { y: today.y, m: today.m, d };
      day =
        d >= 1 && d <= 31
          ? cmpDay(thisMonth, today) >= 0
            ? thisMonth
            : today.m === 12
              ? { y: today.y + 1, m: 1, d }
              : { y: today.y, m: today.m + 1, d }
          : null;
    }
  }

  // Heure : « 14h », « 14h30 », « 14:30 », « 9 heures », « à midi ».
  let time: Slot["time"] = null;
  const tm = t.match(/\b(\d{1,2})\s*(?:h|heures?|:)\s*(\d{2})?\b/);
  if (tm) {
    let h = Number(tm[1]);
    const min = tm[2] ? Number(tm[2]) : 0;
    if ((part === "apres-midi" || part === "soir") && h >= 1 && h < 12) h += 12;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) time = { h, min };
  } else if (/\ba midi\b/.test(t)) {
    time = { h: 12, min: 0 };
  }

  return { day, time, part };
}

/** Vrai si le jour (et l'heure, si donnée) est déjà passé. */
export function isPast(slot: Slot, now: Date): boolean {
  if (!slot.day) return false;
  const p = parisParts(now);
  const c = cmpDay(slot.day, { y: p.y, m: p.m, d: p.d });
  if (c !== 0) return c < 0;
  return slot.time ? slot.time.h * 60 + slot.time.min <= p.h * 60 + p.min : false;
}
