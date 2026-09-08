/**
 * `@tando/copy` — tous les textes visibles par le client, au même endroit.
 * Voir §2 : aucune chaîne « technique » ne doit fuir dans l'UI. Le web et le
 * mobile importent leurs libellés d'ici ; le back-office garde le vocabulaire
 * technique normal et n'utilise pas ce package.
 */
export { glossary, type Glossary } from "./glossary";
export {
  JARGON_BLACKLIST,
  ALLOWED_PHRASES,
  findJargon,
  buildJargonRegex,
  type JargonHit,
} from "./blacklist";
export { site } from "./site";
export { landing, type Landing } from "./landing";
export {
  offers,
  offerRows,
  offersCopy,
  type Offer,
  type OfferRow,
} from "./offers";
export { faq, faqCopy, type FaqItem } from "./faq";
export {
  legalIdentity,
  mentionsLegales,
  conditionsGenerales,
  politiqueConfidentialite,
  cookiesCopy,
  type LegalPage,
  type LegalSection,
} from "./legal";

import { glossary } from "./glossary";

/** Libellés généraux réutilisés partout dans l'app cliente. */
export const common = {
  appName: "Tando",
  tagline: "Recrutez un employé qui ne dort jamais.",
  loading: "Un instant…",
  retry: "Réessayer",
  save: "Enregistrer",
  cancel: "Annuler",
  back: "Retour",
  talkToHuman: glossary.actions.talkToHuman,
} as const;

/** Écran de connexion (web + mobile). */
export const auth = {
  title: "Entrez dans votre espace",
  emailLabel: "Votre adresse email",
  emailPlaceholder: "vous@votre-entreprise.fr",
  submit: "Recevoir mon lien de connexion",
  submitting: "Envoi en cours…",
  sent: {
    title: "C'est envoyé.",
    body: "Ouvrez l'email qu'on vient de vous envoyer et cliquez sur le lien. Il est valable 15 minutes.",
  },
  verifying: "Connexion en cours…",
  error: {
    invalidEmail: "Cette adresse email n'a pas l'air correcte. Vérifiez-la et réessayez.",
    linkExpired:
      "Ce lien a expiré. Demandez-en un nouveau depuis la page de connexion.",
    generic: "La connexion n'a pas abouti. Redemandez un lien et réessayez.",
  },
} as const;

/** Barre de navigation et pied de page du site public. */
export const nav = {
  home: "Accueil",
  catalogue: "Employés disponibles",
  pricing: "Tarifs",
  faq: "Questions",
  account: "Mon espace",
  talkToHuman: glossary.actions.talkToHuman,
  skipToContent: "Aller au contenu",
} as const;

export const footer = {
  baseline: "Votre employé virtuel, 24h/24, 7j/7.",
  columns: {
    product: {
      title: "Le produit",
      links: [
        { label: "Employés disponibles", href: "/employes-virtuels" },
        { label: "Sur mesure", href: "/questionnaire" },
        { label: "Tarifs", href: "/tarifs" },
        { label: "Questions", href: "/faq" },
      ],
    },
    legal: {
      title: "Informations",
      links: [
        { label: "Mentions légales", href: "/mentions-legales" },
        { label: "Conditions générales", href: "/cgv" },
        { label: "Confidentialité", href: "/confidentialite" },
        { label: "Cookies", href: "/cookies" },
      ],
    },
  },
  rights: "Tous droits réservés.",
} as const;

/** Pages encore en construction (catalogue, questionnaire, contact). */
export const stub = {
  catalogue: {
    title: "Les employés disponibles arrivent très bientôt.",
    body: "On finit de préparer les assistants par métier : dentiste, restaurateur, garagiste, coiffeur, agent immobilier, artisan. En attendant, vous pouvez nous décrire votre besoin.",
  },
  questionnaire: {
    title: "Le questionnaire sur mesure arrive très bientôt.",
    body: "Vous pourrez bientôt décrire votre besoin en quelques minutes et recevoir un devis clair. En attendant, écrivez-nous : on vous rappelle.",
  },
  contact: {
    title: "Parlons de votre besoin.",
    body: "Écrivez-nous à bonjour@tando.fr en quelques mots : votre métier, ce qui vous prend du temps, et quand vous rappeler. Une vraie personne vous répond.",
  },
  backHome: "Revenir à l'accueil",
} as const;

/** Coquille de l'espace client (Lot 0 : squelette, rempli au Lot 5). */
export const dashboard = {
  title: glossary.assistant.teamPage,
  empty: {
    title: "Votre équipe est encore vide.",
    body: "Dès qu'un employé virtuel aura pris son poste, vous le retrouverez ici.",
    cta: "Découvrir les employés disponibles",
  },
  signOut: "Se déconnecter",
} as const;
