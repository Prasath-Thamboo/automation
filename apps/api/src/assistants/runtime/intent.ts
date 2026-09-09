/** Détection d'intention par mots-clés. Volontairement conservatrice : en cas de
 *  doute, l'intention est « inconnu » et le moteur escalade (§9.3). */

export type Intent =
  | "salutation"
  | "horaires"
  | "adresse"
  | "prix"
  | "urgence"
  | "rdv"
  | "humain"
  | "merci"
  | "inconnu";

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const has = (t: string, words: string[]): boolean => words.some((w) => t.includes(w));

export function detectIntent(text: string): Intent {
  const t = norm(text);

  if (has(t, ["urgence", "urgent", "en urgence", "tout de suite", "au secours", "grave"])) {
    return "urgence";
  }
  if (
    has(t, [
      "parler a quelqu un",
      "parler a un humain",
      "un humain",
      "une personne",
      "le responsable",
      "le patron",
      "le gerant",
      "quelqu un de l equipe",
    ])
  ) {
    return "humain";
  }
  if (
    has(t, [
      "rendez-vous",
      "rendez vous",
      "rdv",
      "reserver",
      "reservation",
      "creneau",
      "disponibilite",
      "prendre date",
      "une table",
      "un rdv",
      "je voudrais venir",
      "passer vous voir",
    ])
  ) {
    return "rdv";
  }
  if (has(t, ["prix", "tarif", "combien", "coute", "coute-t-il", "devis", "cout"])) {
    return "prix";
  }
  if (has(t, ["horaire", "ouvert", "fermé", "ferme", "quelle heure", "jusqu a quelle heure"])) {
    return "horaires";
  }
  if (has(t, ["adresse", "ou etes-vous", "ou etes vous", "comment venir", "parking", "vous situer", "acces"])) {
    return "adresse";
  }
  if (has(t, ["bonjour", "bonsoir", "salut", "coucou"]) && t.length < 40) return "salutation";
  if (has(t, ["merci", "super merci", "parfait merci", "c est note merci"])) return "merci";

  return "inconnu";
}

/** Repère un jour et éventuellement une heure dans un texte. */
export function parseSlot(text: string, now = new Date()): {
  date: Date | null;
  hasTime: boolean;
  dayLabel: string;
} {
  const t = norm(text);
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  let target: Date | null = null;
  let dayLabel = "";

  if (t.includes("aujourd")) {
    target = new Date(now);
    dayLabel = "aujourd'hui";
  } else if (t.includes("demain")) {
    target = new Date(now.getTime() + 86_400_000);
    dayLabel = "demain";
  } else {
    for (let i = 0; i < 7; i++) {
      if (t.includes(days[i]!)) {
        const cur = now.getUTCDay();
        let delta = (i - cur + 7) % 7;
        if (delta === 0) delta = 7;
        target = new Date(now.getTime() + delta * 86_400_000);
        dayLabel = days[i]!;
        break;
      }
    }
  }

  const timeMatch = t.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/);
  let hasTime = false;
  if (target && timeMatch) {
    const hour = Number(timeMatch[1]);
    const min = timeMatch[2] ? Number(timeMatch[2]) : 0;
    if (hour >= 0 && hour <= 23) {
      target.setUTCHours(hour, min, 0, 0);
      hasTime = true;
    }
  }

  return { date: target, hasTime, dayLabel };
}
