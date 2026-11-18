/**
 * Constantes d'identité du site public. Le nom « Velekya » n'apparaît que dans la
 * barre de navigation, le hero et le pied de page (§8) — ces constantes servent
 * surtout aux métadonnées (title, Open Graph, données structurées).
 */
export const site = {
  name: "Velekya",
  /** Baseline officielle, à utiliser telle quelle (§1). */
  baseline: "Velekya — votre employé virtuel, 24h/24, 7j/7.",
  description:
    "Velekya vous prépare un employé virtuel qui répond à vos clients, prend vos rendez-vous et gère vos demandes courantes. 24h/24, 7j/7, sans engagement.",
  url: "https://velekya.fr",
  locale: "fr_FR",
  contact: {
    email: "bonjour@velekya.fr",
    /** À COMPLÉTER : numéro de téléphone du support. */
    phone: "",
  },
} as const;
