/**
 * Constantes d'identité du site public. Le nom « Tando » n'apparaît que dans la
 * barre de navigation, le hero et le pied de page (§8) — ces constantes servent
 * surtout aux métadonnées (title, Open Graph, données structurées).
 */
export const site = {
  name: "Tando",
  /** Baseline officielle, à utiliser telle quelle (§1). */
  baseline: "Tando — votre employé virtuel, 24h/24, 7j/7.",
  description:
    "Tando vous prépare un employé virtuel qui répond à vos clients, prend vos rendez-vous et gère vos demandes courantes. 24h/24, 7j/7, sans engagement.",
  url: "https://tando.fr",
  locale: "fr_FR",
  contact: {
    email: "bonjour@tando.fr",
    /** À COMPLÉTER : numéro de téléphone du support. */
    phone: "",
  },
} as const;
