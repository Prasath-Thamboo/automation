/**
 * Offres commerciales (§7 du cahier des charges).
 *
 * PROVISOIRE : les prix sont ceux du §7, marqués « [À COMPLÉTER] ». Ils seront
 * remplacés par le moteur de chiffrage configurable en base (`pricing_rules`,
 * Lot 3/4). Ne pas recopier ces montants en dur dans les composants : passer par
 * ce module.
 *
 * Prix affichés : mensuels, TTC, sans engagement (§7).
 */

export interface OfferRow {
  label: string;
  /** Une valeur par offre, dans l'ordre de `offers`. */
  values: readonly [string, string, string];
}

export const offers = [
  {
    id: "ready",
    name: "Prêt à l'emploi",
    tagline: "Un assistant déjà formé à votre métier, actif en quelques minutes.",
    setupPrice: "0 €",
    monthlyPrice: "89 €",
    monthlySuffix: "/mois",
    highlight: true,
    cta: "Voir les employés disponibles",
    ctaHref: "/employes-virtuels",
  },
  {
    id: "custom",
    name: "Sur mesure",
    tagline: "On construit votre assistant à partir de vos règles et de vos outils.",
    setupPrice: "à partir de 890 €",
    monthlyPrice: "à partir de 199 €",
    monthlySuffix: "/mois",
    highlight: false,
    cta: "Décrire mon besoin",
    ctaHref: "/questionnaire",
  },
  {
    id: "custom-plus",
    name: "Sur mesure +",
    tagline: "Plusieurs assistants, formation accompagnée et suivi mensuel.",
    setupPrice: "sur devis",
    monthlyPrice: "sur devis",
    monthlySuffix: "",
    highlight: false,
    cta: "Parler à un humain",
    ctaHref: "/contact",
  },
] as const;

export const offerRows: readonly OfferRow[] = [
  { label: "Mise en service", values: ["0 €", "à partir de 890 €", "sur devis"] },
  { label: "Par mois", values: ["89 €/mois", "à partir de 199 €/mois", "sur devis"] },
  { label: "Assistants inclus", values: ["1", "1", "plusieurs"] },
  { label: "Demandes par mois", values: ["300", "1 000", "illimité"] },
  {
    label: "Formation",
    values: ["Autonome", "Faite avec vous", "Faite avec vous + suivi mensuel"],
  },
  {
    label: "Support",
    values: ["Email sous 48 h", "Email sous 24 h", "Téléphone + interlocuteur dédié"],
  },
  { label: "Essai", values: ["14 jours", "—", "—"] },
] as const;

export const offersCopy = {
  title: "Des tarifs simples, sans engagement.",
  subtitle: "Prix mensuels, toutes taxes comprises. Vous arrêtez quand vous voulez.",
  stopTitle: "Et si je veux arrêter ?",
  stopBody:
    "Vous résiliez en un clic depuis votre espace. Aucune pénalité, aucun préavis, aucune question. Vos données restent exportables pendant 30 jours, puis elles sont effacées.",
  footnote:
    "Les montants « à partir de » dépendent des tâches confiées et du volume de demandes. Vous recevez toujours un devis détaillé avant de vous engager.",
} as const;

export type Offer = (typeof offers)[number];
