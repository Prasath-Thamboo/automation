/**
 * Vocabulaire client (§2 du cahier des charges).
 * La métaphore filée : l'embauche d'un collaborateur. On décrit le poste, on le
 * forme, il travaille, il rend des comptes — sans jamais rompre la métaphore.
 *
 * Toute l'UI cliente tire ses mots d'ici. Rien de « technique » ne doit fuir.
 */

export const glossary = {
  /** Le produit lui-même. */
  assistant: {
    singular: "votre employé virtuel",
    singularShort: "votre assistant",
    plural: "vos employés virtuels",
    /** Titre de la rubrique qui liste les assistants d'une organisation. */
    teamPage: "Mon équipe",
  },

  /** Cycle de vie. */
  lifecycle: {
    deploy: "le mettre au travail",
    hire: "l'embaucher",
    configure: "le former",
    onboarding: "le premier jour",
    pause: "le mettre en pause",
    resume: "le remettre au travail",
    terminate: "résilier son contrat",
  },

  /** Objets métier vus par le client. */
  artifacts: {
    systemPrompt: "la fiche de poste",
    capabilities: "ce qu'il sait faire",
    limits: "ce qu'il ne doit jamais faire",
    dashboard: "le tableau de bord",
    logbook: "son carnet de bord",
    activityToday: "ce qu'il a fait aujourd'hui",
    plan: "son contrat",
    escalations: "à valider",
  },

  /** États affichés. */
  states: {
    working: "au travail",
    paused: "en pause",
    training: "en formation",
  },

  /** Boutons récurrents. */
  actions: {
    talkToHuman: "Parler à un humain",
    putToWork: (name: string) => `Mettre ${name} au travail`,
    needSomethingPrecise: "Je veux quelque chose de plus précis",
  },
} as const;

export type Glossary = typeof glossary;
