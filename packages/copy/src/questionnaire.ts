/**
 * Le questionnaire de besoin (§4.1). Une question par écran, ton conversationnel,
 * phrases courtes, aucun jargon (§2). Les questions suivantes peuvent dépendre
 * des réponses précédentes (`visibleIf`).
 *
 * Structure et libellés vivent ici ; les réponses (JSONB) et le chiffrage vivent
 * dans `@tando/types` et l'API.
 */

export type QuestionKind = "single" | "multi" | "text" | "textarea" | "contact";

export interface Choice {
  value: string;
  label: string;
  hint?: string;
}

export interface ContactField {
  key: string;
  label: string;
  type: "text" | "email" | "tel";
  optional?: boolean;
}

export interface Question {
  /** Clé de la réponse dans `answers`. */
  id: string;
  theme: string;
  title: string;
  help?: string;
  kind: QuestionKind;
  choices?: Choice[];
  /** Autorise une réponse libre « autre ». Stockée dans `answers[id + "Autre"]`. */
  allowOther?: boolean;
  /** Champ libre supplémentaire affiché sous la question. */
  freeText?: { key: string; label: string };
  contactFields?: ContactField[];
  optional?: boolean;
  minSelected?: number;
  /** N'afficher la question que si `answers[key]` contient une des valeurs. */
  visibleIf?: { key: string; anyOf: string[] };
}

export const SECTORS: Choice[] = [
  { value: "restaurant", label: "Restaurant, café, bar" },
  { value: "sante", label: "Cabinet de santé (dentiste, kiné, médecin…)" },
  { value: "auto", label: "Garage, carrosserie" },
  { value: "beaute", label: "Coiffure, esthétique, bien-être" },
  { value: "immobilier", label: "Agence immobilière" },
  { value: "batiment", label: "Artisan du bâtiment" },
  { value: "commerce", label: "Commerce de détail" },
  { value: "services", label: "Autre service de proximité" },
];

export const questionnaire: Question[] = [
  {
    id: "secteur",
    theme: "Votre activité",
    title: "Quel est votre métier ?",
    kind: "single",
    choices: SECTORS,
    allowOther: true,
  },
  {
    id: "taille",
    theme: "Votre activité",
    title: "Vous êtes combien dans l'équipe ?",
    kind: "single",
    choices: [
      { value: "solo", label: "Je suis seul" },
      { value: "2-5", label: "2 à 5 personnes" },
      { value: "6-15", label: "6 à 15 personnes" },
      { value: "15+", label: "Plus de 15" },
    ],
  },
  {
    id: "ville",
    theme: "Votre activité",
    title: "Dans quelle ville êtes-vous ?",
    kind: "text",
  },
  {
    id: "siteWeb",
    theme: "Votre activité",
    title: "Avez-vous un site web ? (facultatif)",
    help: "Si oui, collez son adresse. Sinon, laissez vide.",
    kind: "text",
    optional: true,
  },
  {
    id: "pertesTemps",
    theme: "Votre problème",
    title: "Qu'est-ce qui vous fait perdre le plus de temps aujourd'hui ?",
    help: "Choisissez ce qui vous parle. Vous pourrez préciser juste après.",
    kind: "multi",
    minSelected: 1,
    choices: [
      { value: "telephone", label: "Répondre au téléphone en plein travail" },
      { value: "messages", label: "Répondre aux messages le soir et le week-end" },
      { value: "rdv", label: "Gérer les rendez-vous et les changements" },
      { value: "devis", label: "Faire et relancer les devis" },
      { value: "questions", label: "Répéter toujours les mêmes réponses" },
      { value: "noshow", label: "Les rendez-vous manqués" },
    ],
    freeText: { key: "pertesTempsLibre", label: "Autre chose ? Dites-le avec vos mots." },
  },
  {
    id: "canaux",
    theme: "Vos clients",
    title: "Par où vos clients vous contactent-ils ?",
    kind: "multi",
    minSelected: 1,
    choices: [
      { value: "telephone", label: "Téléphone" },
      { value: "whatsapp", label: "WhatsApp / SMS" },
      { value: "email", label: "Email" },
      { value: "instagram", label: "Instagram / Facebook" },
      { value: "formulaire", label: "Le formulaire de mon site" },
      { value: "surplace", label: "Sur place" },
    ],
  },
  {
    id: "taches",
    theme: "Ce que vous voulez confier",
    title: "Qu'est-ce que votre employé virtuel devrait faire pour vous ?",
    help: "Cochez tout ce qui vous soulagerait.",
    kind: "multi",
    minSelected: 1,
    choices: [
      { value: "repondre-tel", label: "Répondre au téléphone quand je ne peux pas" },
      { value: "prendre-rdv", label: "Prendre et déplacer les rendez-vous" },
      { value: "reserver", label: "Prendre les réservations" },
      { value: "questions", label: "Répondre aux questions habituelles" },
      { value: "relancer-devis", label: "Relancer les devis en attente" },
      { value: "qualifier", label: "Poser les bonnes questions avant de me transmettre" },
      { value: "rappels", label: "Rappeler les clients avant leur rendez-vous" },
      { value: "commandes", label: "Préparer les commandes fournisseurs" },
    ],
  },
  {
    id: "volume",
    theme: "Le volume",
    title: "Combien de demandes recevez-vous, environ ?",
    help: "Une estimation suffit.",
    kind: "single",
    choices: [
      { value: "0-50", label: "Moins de 50 par mois" },
      { value: "50-200", label: "50 à 200 par mois" },
      { value: "200-500", label: "200 à 500 par mois" },
      { value: "500+", label: "Plus de 500 par mois" },
    ],
  },
  {
    id: "agenda",
    theme: "Avec quoi il travaillera",
    title: "Comment gérez-vous votre agenda ?",
    kind: "single",
    choices: [
      { value: "google", label: "Google Agenda" },
      { value: "outlook", label: "Outlook" },
      { value: "reservation", label: "Un outil de réservation en ligne" },
      { value: "papier", label: "Agenda papier" },
      { value: "aucun", label: "Pas d'agenda pour l'instant" },
    ],
    visibleIf: { key: "taches", anyOf: ["prendre-rdv", "reserver", "rappels"] },
  },
  {
    id: "autresOutils",
    theme: "Avec quoi il travaillera",
    title: "Utilisez-vous d'autres outils au quotidien ?",
    kind: "multi",
    optional: true,
    choices: [
      { value: "caisse", label: "Un logiciel de caisse ou de gestion" },
      { value: "tableur", label: "Un tableur (Excel, Google Sheets)" },
      { value: "crm", label: "Un fichier clients" },
      { value: "rien", label: "Rien de particulier" },
    ],
  },
  {
    id: "horaires",
    theme: "Ses horaires",
    title: "Quand doit-il travailler ?",
    kind: "single",
    choices: [
      { value: "toujours", label: "Tout le temps, jour et nuit" },
      { value: "ouverture", label: "Pendant mes heures d'ouverture" },
      { value: "hors-ouverture", label: "Seulement quand je suis fermé" },
    ],
  },
  {
    id: "limites",
    theme: "Ses limites",
    title: "Y a-t-il des choses qu'il ne doit jamais faire ?",
    help: "Par exemple : ne jamais donner un prix, ne jamais confirmer une urgence, ne jamais promettre un délai.",
    kind: "textarea",
    optional: true,
  },
  {
    id: "ton",
    theme: "Sa façon de parler",
    title: "Comment doit-il répondre à vos clients ?",
    help: "Choisissez le message qui vous ressemble le plus.",
    kind: "single",
    choices: [
      {
        value: "chaleureux",
        label: "« Bonjour ! Avec plaisir, je vous trouve un créneau tout de suite. »",
        hint: "Chaleureux et direct",
      },
      {
        value: "pose",
        label: "« Bonjour, je vous propose deux créneaux. Dites-moi celui qui vous convient. »",
        hint: "Posé et efficace",
      },
      {
        value: "formel",
        label: "« Bonjour, je vous remercie de votre message. Voici les disponibilités. »",
        hint: "Plutôt formel",
      },
    ],
  },
  {
    id: "coordonnees",
    theme: "Pour vous recontacter",
    title: "Où peut-on vous joindre ?",
    kind: "contact",
    contactFields: [
      { key: "nom", label: "Votre nom", type: "text" },
      { key: "entreprise", label: "Le nom de votre entreprise", type: "text" },
      { key: "email", label: "Votre email", type: "email" },
      { key: "telephone", label: "Votre téléphone", type: "tel" },
      { key: "quandRappeler", label: "Quand vous rappeler ? (facultatif)", type: "text", optional: true },
    ],
  },
];

export const questionnaireCopy = {
  start: {
    title: "Décrivez votre besoin en quelques minutes.",
    body: "Une question à la fois, aucune connaissance technique demandée. Vous pouvez vous interrompre : on vous enverra un lien pour reprendre où vous en étiez.",
    cta: "Commencer",
    emailLabel: "Votre email (pour reprendre plus tard)",
  },
  progress: (n: number, total: number) => `Question ${n} sur ${total}`,
  next: "Suivant",
  back: "Précédent",
  saved: "Réponses enregistrées",
  otherLabel: "Autre :",
  resume: {
    subject: "Reprenez la description de votre besoin",
    linkText: "Reprendre où j'en étais",
  },
  review: {
    title: "Voici l'employé qu'on va vous préparer",
    body: "Relisez cette fiche de poste. Vous pouvez tout corriger avant de nous l'envoyer.",
    tasksTitle: "Ce qu'il fera pour vous",
    channelsTitle: "Là où il répondra",
    hoursTitle: "Ses horaires",
    limitsTitle: "Ce qu'il ne fera jamais",
    toneTitle: "Sa façon de parler",
    toolsTitle: "Avec quoi il travaillera",
    editCta: "Corriger",
    submitCta: "Envoyer ma demande",
    submitted: {
      title: "C'est envoyé.",
      body: "On prépare votre devis à la main. Vous le recevrez par email sous 2 jours ouvrés, avec le détail de ce qui est prévu et le prix.",
    },
  },
} as const;
