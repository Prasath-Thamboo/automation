/**
 * Heures de silence (§6bis) : le client choisit une fenêtre « HH:mm–HH:mm »
 * pendant laquelle il ne veut aucune notification non vitale. Tout est calculé
 * dans le fuseau de l'appareil, sans dépendance externe (Intl suffit).
 */

/** Heure locale (0–23) dans `timeZone` pour l'instant `now`. */
export function localHour(now: Date, timeZone: string): number {
  const part = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  })
    .formatToParts(now)
    .find((p) => p.type === "hour")?.value;
  return Number(part ?? "0") % 24;
}

/** Date locale « AAAA-MM-JJ » dans `timeZone` (pour dédupliquer un envoi quotidien). */
export function localDateKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(now);
  return parts; // en-CA => "2026-09-09"
}

function toMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * `true` si l'instant `now` tombe dans la fenêtre de silence [start, end[ du
 * fuseau donné. Gère une fenêtre qui passe minuit (ex. 22:00 → 07:00). Si l'une
 * des bornes est absente ou mal formée, il n'y a pas de silence.
 */
export function isWithinQuietHours(
  now: Date,
  timeZone: string,
  start: string | null,
  end: string | null,
): boolean {
  if (!start || !end) return false;
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null || s === e) return false;

  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const cur = hh * 60 + mm;

  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}
