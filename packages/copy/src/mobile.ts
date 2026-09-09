/**
 * Libellés propres à l'application mobile (§6bis). Vocabulaire client (§2) :
 * on parle d'un collaborateur, jamais de technique. Aucune notification
 * commerciale — uniquement ce qui aide le patron à garder la main.
 */

import { glossary } from "./glossary";

/** Écran « À valider » : le patron répond à ce que l'assistant n'a pas su traiter. */
export const escalations = {
  title: glossary.artifacts.escalations,
  empty: {
    title: "Rien à valider.",
    body: "Quand votre employé ne saura pas répondre, sa question apparaîtra ici.",
  },
  askedAt: "Demandé",
  answerLabel: "Votre réponse",
  answerPlaceholder: "Répondez en une phrase…",
  send: "Envoyer",
  sending: "Envoi…",
  sent: "C'est envoyé. Il reprend la main.",
  /** Réponses toutes prêtes, pour traiter d'un pouce (§6bis : moins de 15 s). */
  quickReplies: [
    "Oui, c'est possible.",
    "Non, ce n'est pas possible.",
    "C'est noté, je m'en occupe.",
    "Rappelle-moi les détails.",
    "Propose un autre créneau.",
  ],
  offlineQueued: "Pas de réseau : votre réponse partira dès que la connexion revient.",
} as const;

/** Dictée vocale (réponse d'escalade et consigne). */
export const voice = {
  start: "Dicter",
  listening: "Parlez maintenant…",
  stop: "Terminer",
  unavailable: "La dictée n'est pas disponible sur cet appareil. Utilisez le clavier.",
  permissionDenied:
    "Pour dicter, autorisez le micro dans les réglages de votre téléphone.",
} as const;

/** Écran « Le former » sur mobile. */
export const training = {
  title: "Le former",
  intro: "Ajoutez une consigne en langage courant. Il en tiendra compte tout de suite.",
  placeholder: "Ex. : quand on demande le parking, il y en a un derrière le bâtiment.",
  add: "Ajouter la consigne",
  adding: "Ajout…",
  history: "Ses consignes",
  empty: "Aucune consigne pour l'instant.",
} as const;

/** Réglages de notification. */
export const notifications = {
  title: "Notifications",
  intro: "Vous choisissez quand votre téléphone vous sollicite. Jamais de publicité.",
  escalations: {
    label: "Quand il a besoin de vous",
    help: "Une demande qu'il n'a pas su traiter seul.",
  },
  dailySummary: {
    label: "Le résumé d'hier",
    help: "Un point une fois par jour sur ce qu'il a fait.",
    hourLabel: "Heure d'envoi",
  },
  paymentFailure: {
    label: "Souci de paiement",
    help: "Si un règlement d'abonnement n'aboutit pas.",
  },
  quietHours: {
    label: "Heures de silence",
    help: "Aucune alerte pendant cette plage. Elles vous attendent au réveil.",
    from: "De",
    to: "à",
    enable: "Activer les heures de silence",
  },
  saved: "Réglages enregistrés.",
  askPermission: {
    title: "Rester prévenu, même sans ouvrir l'app",
    body: "On vous envoie une notification seulement quand votre employé a besoin de vous.",
    allow: "Activer les notifications",
    later: "Plus tard",
  },
} as const;

/** Bandeau d'état de connexion et file d'actions hors ligne. */
export const connectivity = {
  offline: "Hors connexion — vous consultez la dernière version reçue.",
  reconnecting: "Reconnexion…",
  queued: (n: number) =>
    n === 1 ? "1 action en attente d'envoi" : `${n} actions en attente d'envoi`,
  syncing: "Envoi des actions en attente…",
  synced: "Tout est à jour.",
} as const;

/** Widget d'écran d'accueil (mise en pause rapide). */
export const widget = {
  pause: "Mettre en pause",
  resume: "Remettre au travail",
  working: "Au travail",
  paused: "En pause",
} as const;

export type MobileNotifications = typeof notifications;
