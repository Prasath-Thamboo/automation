import type { AssessmentAnswers, JobDescriptionContent } from "@tando/types";

/**
 * Construit la fiche de poste en langage clair (§4.1) à partir des réponses au
 * questionnaire. Déterministe, sans jargon : on décrit un poste, en bénéfices.
 * Le client peut ensuite corriger cette fiche avant de l'envoyer.
 */

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const isText = (x: unknown): x is string => typeof x === "string" && x.length > 0;

const TASK_PHRASES: Record<string, string> = {
  "repondre-tel": "Répondre au téléphone quand vous ne pouvez pas et noter chaque demande",
  "prendre-rdv": "Prendre, déplacer et annuler des rendez-vous dans votre agenda",
  reserver: "Prendre les réservations et gérer les changements",
  questions: "Répondre aux questions habituelles : horaires, adresse, tarifs affichés",
  "relancer-devis": "Relancer les devis en attente au rythme que vous fixez",
  qualifier: "Poser les bonnes questions avant de vous transmettre une demande",
  rappels: "Rappeler vos clients avant leur rendez-vous",
  commandes: "Préparer les commandes fournisseurs pour votre validation",
};

const CHANNEL_PHRASES: Record<string, string> = {
  telephone: "Au téléphone",
  whatsapp: "Sur WhatsApp et par SMS",
  email: "Par email",
  instagram: "Sur Instagram et Facebook",
  formulaire: "Depuis le formulaire de votre site",
  surplace: "Pour les demandes prises sur place",
};

const TOOL_PHRASES: Record<string, string> = {
  google: "Votre Google Agenda",
  outlook: "Votre agenda Outlook",
  reservation: "Votre outil de réservation en ligne",
  papier: "Votre agenda (que vous tiendrez à jour ensemble)",
  caisse: "Votre logiciel de caisse ou de gestion",
  tableur: "Votre tableur",
  crm: "Votre fichier clients",
};

const HOURS_PHRASES: Record<string, string> = {
  toujours: "24 h/24, 7 j/7, week-ends et jours fériés compris",
  ouverture: "Pendant vos heures d'ouverture",
  "hors-ouverture": "Quand vous êtes fermé (soir, nuit, week-end)",
};

const TONE_PHRASES: Record<string, string> = {
  chaleureux: "Chaleureux et direct, avec le sourire",
  pose: "Posé et efficace, il va droit au but",
  formel: "Plutôt formel et courtois",
};

export function buildJobDescription(answers: AssessmentAnswers): JobDescriptionContent {
  const tasks = arr(answers.taches)
    .map((t) => TASK_PHRASES[t])
    .filter(isText);

  const channels = arr(answers.canaux)
    .map((c) => CHANNEL_PHRASES[c])
    .filter(isText);

  const tools: string[] = [];
  const agenda = str(answers.agenda);
  if (agenda && agenda !== "aucun" && TOOL_PHRASES[agenda]) tools.push(TOOL_PHRASES[agenda]!);
  for (const o of arr(answers.autresOutils)) {
    if (o !== "rien" && TOOL_PHRASES[o]) tools.push(TOOL_PHRASES[o]!);
  }

  const hours = HOURS_PHRASES[str(answers.horaires)] ?? "À définir ensemble";
  const tone = TONE_PHRASES[str(answers.ton)] ?? "À définir ensemble";

  const limitsText = str(answers.limites).trim();
  const limits = limitsText
    ? limitsText
        .split(/\n|;|\. /)
        .map((l) => l.trim().replace(/\.$/, ""))
        .filter(Boolean)
    : ["Il ne s'avance jamais : ce dont il n'est pas sûr, il vous le transmet."];

  const company = str(answers.entreprise) || "votre entreprise";
  const summary =
    `Un employé virtuel pour ${company}. Il répond à vos clients ` +
    (channels.length ? `${lowerFirst(channels.join(", "))}, ` : "") +
    `${lowerFirst(hours)}. ` +
    (tasks.length
      ? `Concrètement, il ${lowerFirst(tasks[0]!)}${tasks.length > 1 ? ", et plus encore" : ""}.`
      : "");

  const outOfScope = [
    "Encaisser des paiements ou communiquer un prix qui n'est pas affiché",
    "Donner un conseil qui engage votre responsabilité (santé, sécurité, droit)",
    "Décider seul dans les cas que vous avez marqués comme sensibles",
  ];

  return {
    summary,
    tasks: tasks.length ? tasks : ["Répondre à vos clients et vous transmettre les demandes"],
    channels: channels.length ? channels : ["Par les canaux que vous utilisez déjà"],
    hours,
    limits,
    tone,
    tools: tools.length ? tools : ["Les outils que vous utilisez déjà, une fois raccordés"],
    outOfScope,
  };
}

/** Bénéfices formulés pour le devis (§4.2 : « il prendra vos rendez-vous… »). */
export function benefitsFromAnswers(answers: AssessmentAnswers): string[] {
  const map: Record<string, string> = {
    "repondre-tel": "Vos appels manqués deviennent des demandes traitées, pas des clients perdus",
    "prendre-rdv": "Vos rendez-vous se prennent et se décalent sans que vous décrochiez",
    reserver: "Vos réservations rentrent même en plein service",
    questions: "Vous ne répétez plus vingt fois par jour les mêmes réponses",
    "relancer-devis": "Vos devis en attente sont relancés, sans que vous y pensiez",
    qualifier: "Vous ne recevez que des demandes déjà cadrées",
    rappels: "Moins de rendez-vous manqués grâce aux rappels",
    commandes: "Vos commandes fournisseurs sont préparées, vous n'avez qu'à valider",
  };
  return arr(answers.taches)
    .map((t) => map[t])
    .filter(isText);
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
