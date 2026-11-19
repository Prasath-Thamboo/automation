/**
 * Politique de sécurité du contenu (§9.4, Lot 18). Un nonce par requête,
 * posé par `middleware.ts` : Next le lit dans l'en-tête de la requête et
 * l'applique à ses propres scripts. `'strict-dynamic'` laisse ces scripts
 * charger leurs morceaux ; aucun autre script inline ne passe.
 *
 * Conséquence assumée : toutes les pages sont rendues à la demande (le nonce
 * change à chaque requête) — voir `connection()` dans `app/layout.tsx`.
 */
export interface CspOptions {
  nonce: string;
  /** Origine de l'API appelée depuis le navigateur (questionnaire, formulaire). */
  apiOrigin: string;
  dev: boolean;
  /** Formulaire public (Lot 12) : affichable dans le site du client. */
  embeddable: boolean;
}

/** Paiement : un formulaire sans JavaScript peut être redirigé vers Stripe. */
const PAYMENT_ORIGIN = "https://checkout.stripe.com";

export function buildCsp({ nonce, apiOrigin, dev, embeddable }: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // `unsafe-eval` : rechargement à chaud de React, en développement seulement.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    // Attributs `style` de React et polices injectées : pas de nonce possible.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", apiOrigin, ...(dev ? ["ws:"] : [])],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", PAYMENT_ORIGIN],
    "frame-ancestors": [embeddable ? "*" : "'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Nonce aléatoire (128 bits, base64), compatible runtime Edge. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "'self'";
  }
}
