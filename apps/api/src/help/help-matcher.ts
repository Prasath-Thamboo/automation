/**
 * Recherche de la réponse à une question du patron dans la base d'aide (Lot 15).
 * Pur, sans fournisseur de modèle : recouvrement de mots (racines simples) entre
 * la question et chaque fiche (sa question + ses mots-clés). Volontairement
 * prudent : sous le seuil, on ne répond pas — on propose des pistes ou la
 * transmission à l'équipe Velekya.
 */

export interface MatchableArticle {
  id: string;
  question: string;
  keywords: string[];
}

export interface HelpMatch<T extends MatchableArticle> {
  /** Fiche retenue, ou null si aucune n'est assez sûre. */
  best: T | null;
  /** Autres fiches proches, par pertinence décroissante. */
  suggestions: T[];
}

/** Score minimal pour répondre directement. */
export const ANSWER_THRESHOLD = 3;
/** Score minimal pour proposer une fiche en piste. */
export const SUGGEST_THRESHOLD = 2;
const MAX_SUGGESTIONS = 3;

const STOPWORDS = new Set([
  "les", "des", "une", "est", "que", "qui", "quoi", "quel", "quelle", "quels", "quelles",
  "pour", "par", "sur", "dans", "avec", "sans", "sous", "aux", "du", "de", "la", "le",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos",
  "leur", "leurs", "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "ce", "cet", "cette", "ces", "ca", "cela", "comment", "pourquoi", "quand", "combien",
  "est-ce", "estce", "peux", "peut", "puis", "pouvez", "faut", "fait", "faire",
  "suis", "sont", "etre", "avoir", "ai", "as", "a", "ont", "pas", "plus", "bien", "tres",
  "aussi", "encore", "alors", "donc", "mais", "ou", "et", "si", "y", "en", "ne", "me", "se",
  "bonjour", "merci", "svp", "possible", "voudrais", "veux", "aimerais", "souhaite",
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’-]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SUFFIXES = ["ees", "ee", "er", "ez", "es", "e"];

/** Racine grossière d'un mot déjà normalisé : « factures » → « factur »,
 *  « payee » / « payer » / « paye » → « pay », « trouve » / « trouver » → « trouv ». */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1);
  for (const s of SUFFIXES) {
    if (w.endsWith(s) && w.length - s.length >= 3) return w.slice(0, -s.length);
  }
  return w;
}

export function terms(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map(stem);
}

/** Score d'une fiche pour une question : mots communs (×1 question, ×2 mot-clé),
 *  +3 par expression-clé (plusieurs mots) retrouvée telle quelle. */
export function scoreArticle(query: string, article: MatchableArticle): number {
  return scoreDetail(query, article).score;
}

function scoreDetail(query: string, article: MatchableArticle): { score: number; covered: boolean } {
  const normQuery = ` ${normalize(query)} `;
  const queryTerms = new Set(terms(query));
  const weights = new Map<string, number>();
  for (const t of terms(article.question)) weights.set(t, Math.max(weights.get(t) ?? 0, 1));
  for (const k of article.keywords) {
    for (const t of terms(k)) weights.set(t, 2);
  }

  let score = 0;
  for (const [t, w] of weights) if (queryTerms.has(t)) score += w;
  for (const k of article.keywords) {
    const phrase = normalize(k);
    if (phrase.includes(" ") && normQuery.includes(` ${phrase} `)) score += 3;
  }
  // Question courte entièrement couverte (« Résilier ? ») : assez sûr.
  const covered = queryTerms.size > 0 && [...queryTerms].every((t) => weights.has(t));
  return { score, covered };
}

export function matchHelp<T extends MatchableArticle>(query: string, articles: T[]): HelpMatch<T> {
  const ranked = articles
    .map((article) => ({ article, ...scoreDetail(query, article) }))
    .filter((r) => r.score >= SUGGEST_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  // Égalité parfaite en tête : on ne tranche pas à la place du patron.
  const confident = top && (top.score >= ANSWER_THRESHOLD || top.covered);
  const best = top && confident && (!second || second.score < top.score) ? top.article : null;

  return {
    best,
    suggestions: ranked
      .filter((r) => r.article !== best)
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => r.article),
  };
}
