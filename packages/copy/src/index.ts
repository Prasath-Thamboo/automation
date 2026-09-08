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
