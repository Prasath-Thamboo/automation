/**
 * Lot 16 — embauche d'un employé « prêt à l'emploi » en libre-service, avec
 * essai gratuit. Pas de carte demandée : la première facture part à la fin de
 * l'essai et se règle depuis « Mes documents » — ou est prélevée si le client a
 * enregistré une carte (Lot 22, `savedCardCopy`).
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

/**
 * Lot 22 — carte enregistrée pour le prélèvement automatique (« Mes documents »,
 * web uniquement : l'application mobile n'affiche aucun moyen de paiement).
 */
export const savedCardCopy = {
  title: "Prélèvement automatique",
  none: "Enregistrez une carte : chaque facture mensuelle sera réglée automatiquement le jour de son émission. Vous gardez la main : vous pouvez la retirer à tout moment.",
  add: "Enregistrer ma carte",
  replace: "Changer de carte",
  adding: "Un instant…",
  remove: "Retirer la carte",
  removing: "Un instant…",
  card: (brand: string | null, last4: string | null) =>
    `Carte ${brand ? brandLabel(brand) : "bancaire"}${last4 ? ` se terminant par ${last4}` : ""}`,
  expires: (month: number, year: number) => `expire fin ${String(month).padStart(2, "0")}/${String(year).slice(-2)}`,
  active:
    "Chaque facture mensuelle est réglée avec cette carte le jour de son émission. Si le paiement ne passe pas, nous vous prévenons et vous pouvez régler depuis cette page.",
  /** Retour depuis la page de paiement sécurisée. */
  returnedOk: "Merci ! Votre carte est en cours d'enregistrement : elle apparaîtra ici dans quelques instants.",
  returnedCancel: "L'enregistrement de la carte a été interrompu. Vous pouvez recommencer quand vous voulez.",
  saved: "Votre carte est enregistrée.",
  removed: "La carte est retirée. Vos prochaines factures se régleront depuis cette page.",
  failed: "Cela n'a pas abouti. Réessayez dans un instant.",
  ownerOnly: "Seul le titulaire du compte peut gérer le moyen de paiement.",
} as const;

function brandLabel(brand: string): string {
  const names: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    cartes_bancaires: "CB",
  };
  return names[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}
