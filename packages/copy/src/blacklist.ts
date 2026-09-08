/**
 * Liste noire de jargon (§2 du cahier des charges).
 * Aucun de ces termes ne doit apparaître dans une interface vue par le client :
 * textes de `@tando/copy` et JSX de `apps/web`.
 *
 * Un test automatisé (`blacklist.test.ts`) échoue si l'un d'eux fuit.
 */

/** Termes interdits. Comparaison sur mots entiers, insensible à la casse. */
export const JARGON_BLACKLIST = [
  "agent IA",
  "agent",
  "LLM",
  "prompt",
  "modèle",
  "token",
  "workflow",
  "orchestration",
  "RAG",
  "embedding",
  "fine-tuning",
  "API",
  "intégration",
  "automatisation",
  "pipeline",
  "IA générative",
  "chatbot",
] as const;

/**
 * Occurrences légitimes : un terme de la liste noire peut faire partie d'une
 * expression métier acceptable. Ex. « agent immobilier » est un métier, pas un
 * « agent IA ». Ces expressions sont autorisées telles quelles.
 */
export const ALLOWED_PHRASES = [
  "agent immobilier",
  "agent immobilière",
  "agents immobiliers",
  "agence immobilière",
] as const;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Regex qui matche n'importe quel terme interdit sur des frontières de mot. */
export function buildJargonRegex(): RegExp {
  const alternatives = JARGON_BLACKLIST.map((term) =>
    term.split(/\s+/).map(escapeRegExp).join("\\s+"),
  ).join("|");
  return new RegExp(`(?<!\\p{L})(${alternatives})(?!\\p{L})`, "giu");
}

const allowedRegex = new RegExp(
  `(?<!\\p{L})(${ALLOWED_PHRASES.map(escapeRegExp).join("|")})(?!\\p{L})`,
  "giu",
);

export interface JargonHit {
  term: string;
  index: number;
  excerpt: string;
}

/** Vrai si l'index tombe dans une expression explicitement autorisée. */
function isWithinAllowedPhrase(text: string, index: number): boolean {
  for (const m of text.matchAll(allowedRegex)) {
    const start = m.index ?? 0;
    if (index >= start && index < start + m[0].length) return true;
  }
  return false;
}

/** Retourne toutes les occurrences de jargon dans un texte, hors expressions autorisées. */
export function findJargon(text: string): JargonHit[] {
  const re = buildJargonRegex();
  const hits: JargonHit[] = [];
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (isWithinAllowedPhrase(text, idx)) continue;
    hits.push({
      term: m[1] ?? m[0],
      index: idx,
      excerpt: text.slice(Math.max(0, idx - 30), idx + 40).replace(/\s+/g, " "),
    });
  }
  return hits;
}
