/**
 * Lot 16 — embauche d'un employé « prêt à l'emploi » en libre-service, avec
 * essai gratuit. Pas de carte demandée : la première facture part à la fin de
 * l'essai et se règle depuis « Mes documents ».
 */
export const subscribeCopy = {
  /** Bouton principal de la fiche métier. */
  tryCta: (name: string, trialDays: number) =>
    trialDays > 0 ? `Essayer ${name} ${trialDays} jours gratuitement` : `Embaucher ${name}`,
  customCta: "Je veux quelque chose de plus précis",
  back: "← Revenir à la fiche",
  title: (name: string) => `Mettre ${name} au travail`,
  perMonth: "/ mois, TTC · sans engagement",
  trial: (days: number) =>
    days > 0
      ? `${days} jours d'essai gratuit. Aucune carte demandée : votre première facture arrive à la fin de l'essai, et vous pouvez arrêter avant sans rien payer.`
      : "Votre première facture arrive aujourd'hui. Sans engagement.",
  next: "Ensuite, vous lui présentez votre entreprise en 4 écrans (environ 5 minutes), puis il prend son poste.",
  confirm: (name: string) => `Mettre ${name} au travail`,
  confirming: "Un instant…",
  failed: "L'embauche n'a pas abouti. Réessayez dans un instant.",
  /** Bandeau « Mes documents » / « Mon compte » pendant l'essai. */
  trialUntil: (date: string) => `Essai gratuit jusqu'au ${date}`,
} as const;
