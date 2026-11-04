/**
 * Lot 15 — « Une question ? » : l'aide au patron dans son espace (web + mobile).
 * Les réponses elles-mêmes sont écrites par l'équipe Tando (back-office).
 */
export const helpCopy = {
  title: "Une question ?",
  intro:
    "Votre contrat, vos factures, votre employé virtuel… Posez votre question avec vos mots. Si nous n'avons pas la réponse toute prête, l'équipe Tando vous répond.",
  placeholder: "Par exemple : où trouver mes factures ?",
  ask: "Poser ma question",
  asking: "Je cherche…",
  topicsTitle: "Les questions les plus posées",
  noAnswer:
    "Je n'ai pas de réponse sûre à cette question. Plutôt que de vous dire n'importe quoi, je peux la transmettre à l'équipe Tando.",
  maybe: "Vous cherchez peut-être :",
  helpfulQuestion: "Cette réponse vous aide ?",
  helpfulYes: "Oui, merci",
  helpfulNo: "Non",
  thanks: "Merci pour votre retour.",
  transmit: "Transmettre à l'équipe Tando",
  transmitted:
    "C'est transmis. Une personne de l'équipe Tando vous répond par email, et la réponse apparaîtra ici.",
  historyTitle: "Vos questions",
  historyEmpty: "Vous n'avez encore posé aucune question.",
  you: "Vous",
  tando: "Tando",
  teamAnswer: "Réponse de l'équipe Tando",
  status: {
    repondue: "Répondu",
    sans_reponse: "Sans réponse",
    transmise: "Transmise à l'équipe",
    traitee: "L'équipe a répondu",
  },
  /** Où renvoyer après une réponse (`HelpAction`). */
  actions: {
    equipe: "Voir mon équipe",
    documents: "Voir mes documents",
    compte: "Voir mon compte",
    reglages: "Régler les notifications",
    carnet: "Voir son carnet de bord",
  },
  error: "Votre question n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.",
} as const;
