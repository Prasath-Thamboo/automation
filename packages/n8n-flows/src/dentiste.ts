/**
 * Flux générique « Cabinet dentaire » (prêt à l'emploi, Lot 16).
 *
 * Partagé par tous les cabinets abonnés : tout ce qui est propre au cabinet
 * arrive dans la requête (établissement, spécificités du « premier jour »,
 * consignes, boutons). Rien n'est stocké ici.
 *
 * Principe : il répond quand il est sûr, sinon il transmet au cabinet. Il ne
 * donne jamais de conseil médical, ne juge jamais qu'une situation n'est pas
 * urgente, et ne confirme pas seul un créneau (l'agenda du cabinet n'est pas
 * consulté) : il note une demande que le cabinet valide.
 *
 * Spécificités lues (catalogue, `personalization`) : `praticiens`,
 * `types_soins`, `urgences` (oui/non), `logiciel_agenda`.
 * Boutons lus : `rendez_vous`, `nouveaux_patients` (absents = allumés). Leurs
 * libellés par défaut sont dans `apps/api/prisma/seed-data/catalog.ts`.
 */
import {
  appointment,
  clip,
  escalate,
  has,
  humanDay,
  humanTime,
  isPast,
  isValidRequest,
  matchInstruction,
  norm,
  parisToISO,
  parseSlot,
  pickSpecific,
  reply,
  sentence,
  splitList,
  switchOn,
  yesNo,
  type FlowReply,
  type FlowRequest,
  asksPrice,
} from "./common";


const PAIN = [
  "mal aux dents", "mal a une dent", "mal a la dent", "mal au dent", "mal a ma dent", "mal aux gencives",
  "rage de dent", "douleur", "douloureu", "j ai mal", "tres mal", "abces", "gonfle", "gonflement",
  "enfle", "saigne", "saignement", "dent cassee", "dent casse", "dent fendue", "dent felee",
  "dent tombee", "dent qui bouge", "dent arrachee", "pris un coup", "recu un coup", "un choc", "fievre", "infection", "infecte",
  "couronne tombee", "couronne est tombee", "couronne s est decollee", "plombage tombe", "plombage est tombe",
];

const MEDICAL = [
  "medicament", "antibiotique", "doliprane", "paracetamol", "ibuprofene", "advil", "anti inflammatoire",
  "est ce normal", "c est normal", "est ce grave", "apres l extraction", "apres une extraction",
  "apres le soin", "apres mon soin", "ordonnance", "enceinte", "allaite", "bain de bouche",
];

const CANCEL = ["annuler", "annulation", "decommander", "ne pourrai pas venir", "ne pourrais pas venir", "ne peux pas venir", "empeche"];

const MOVE = [
  "decaler", "deplacer", "reporter", "changer mon rendez", "changer de rendez", "changer mon rdv",
  "modifier mon rendez", "modifier mon rdv", "avancer mon rendez", "avancer mon rdv", "autre creneau",
];

const BOOK = [
  "rendez vous", "rdv", "reserver", "creneau", "disponibilite", "dispo", "consultation", "controle",
  "detartrage", "voir le dentiste", "voir un dentiste", "voir le docteur", "voir la dentiste",
  "premiere visite", "premier rendez", "nouveau patient", "nouvelle patiente", "venir au cabinet",
  "passer au cabinet", "prendre date",
];

const NEW_PATIENT = [
  "nouveau patient", "nouvelle patiente", "premiere fois", "premiere visite", "jamais venu",
  "pas encore patient", "pas encore patiente", "nouveau au cabinet", "nouvelle au cabinet", "vient d emmenager",
  "viens d emmenager", "suivre chez vous", "devenir patient", "devenir patiente",
];

const HOURS = ["horaire", "ouvert", "ouverte", "ferme", "quelle heure", "jusqu a quelle heure", "a partir de quelle heure"];
const ADDRESS = ["adresse", "ou etes vous", "ou se trouve", "comment venir", "parking", "garer", "vous situer", "acces", "metro", "bus", "tram"];
/** Tournures parlées (« c'est où ? », « où est le cabinet ? ») — mot entier, pour ne pas lire « c'est ouvert ». */
const ADDRESS_RE = /\b(c est ou|ou est (le|votre|ce) cabinet|ou est situe|ou ca se trouve|situe ou)\b/;
const asksAddress = (t: string): boolean => has(t, ADDRESS) || ADDRESS_RE.test(t);
const PRACTITIONERS = [
  "quel dentiste", "quels dentistes", "quelle dentiste", "praticien", "praticienne", "quel docteur",
  "qui consulte", "qui sont les dentistes", "combien de dentistes", "les dentistes du cabinet",
];
const COVERAGE = [
  "carte vitale", "mutuelle", "tiers payant", "cmu", "c2s", "aide medicale", "rembourse", "remboursement",
  "secu", "securite sociale", "prise en charge", "feuille de soin",
];
const ASKS_IF_OFFERED = [
  "faites vous", "vous faites", "est ce que vous", "proposez", "pratiquez", "possible de", "vous posez",
  "vous soignez", "vous prenez", "vous acceptez", "il y a",
];

/** Soins reconnus : libellé client → mots qui le désignent. */
const CARE: Array<{ label: string; words: string[] }> = [
  { label: "les implants", words: ["implant"] },
  { label: "l'orthodontie", words: ["orthodont", "appareil dentaire", "aligneur", "invisalign", "bagues"] },
  { label: "le blanchiment", words: ["blanchiment", "blanchir"] },
  { label: "le détartrage", words: ["detartrage"] },
  { label: "les prothèses", words: ["prothese", "couronne", "bridge", "dentier", "facette"] },
  { label: "les soins des enfants", words: ["enfant", "pediatr", "pedodont", "bebe"] },
  { label: "les soins des gencives", words: ["parodont", "gencive"] },
  { label: "les extractions", words: ["extraction", "dent de sagesse", "dents de sagesse", "arracher"] },
  { label: "les soins des caries", words: ["carie", "devitalis", "plombage"] },
  { label: "la radiographie", words: ["radio", "panoramique"] },
];

const BOOKING_QUESTION = /quel jour|quel moment|quelle heure|creneau/;
const EMERGENCY_NOTE =
  "Si la douleur devient insupportable, ou en cas de fièvre ou de gonflement important, appelez le 15.";

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets au cabinet, qui vous répond très vite.",
      "Message transmis au cabinet.",
    );
  }

  const a = req.assistant;
  const sp = a.specifics ?? {};
  const instructions = req.instructions ?? [];
  const history = req.history ?? [];
  const t = norm(req.text);
  const quote = `Message reçu : « ${clip(req.text)} ».`;

  const recentClient = history
    .filter((m) => m.author === "client")
    .slice(-4)
    .map((m) => m.text);
  const recentClientNorm = norm(recentClient.join(" "));
  const lastAssistant = norm([...history].reverse().find((m) => m.author === "assistant")?.text ?? "");
  const bookingInProgress = BOOKING_QUESTION.test(lastAssistant);
  const doctolib = norm(sp.logiciel_agenda ?? "") === "doctolib";

  // ── 1. Douleur ou problème dentaire : toujours transmis, jamais minimisé ──
  if (has(t, PAIN)) {
    const urgences = yesNo(sp.urgences);
    const policy =
      urgences === true
        ? " Le cabinet accepte les urgences : à rappeler rapidement."
        : urgences === false
          ? " Le cabinet a indiqué ne pas prendre les urgences : à réorienter."
          : " À rappeler rapidement.";
    return escalate(
      "Un patient signale une douleur ou un problème dentaire.",
      `${quote}${policy}`,
      `C'est noté. Je préviens tout de suite le cabinet pour qu'on vous rappelle au plus vite. ${EMERGENCY_NOTE}`,
      "Patient qui signale une douleur : transmis au cabinet.",
    );
  }

  // ── 2. Question médicale : jamais de conseil ──
  if (has(t, MEDICAL)) {
    return escalate(
      "Un patient pose une question médicale.",
      quote,
      `Je ne peux pas donner de conseil médical, mais je transmets votre question au praticien, qui vous répond rapidement. ${EMERGENCY_NOTE}`,
      "Question médicale d'un patient : transmise au praticien.",
    );
  }

  // ── Prix : jamais de chiffre inventé, la demande est transmise ──
  if (asksPrice(t)) {
    return escalate(
      "Un patient demande un tarif.",
      quote,
      "Je transmets votre question au cabinet, qui vous indique le tarif très vite.",
      "Question de tarif : transmise au cabinet.",
    );
  }

  // ── 3. Annulation ──
  if (has(t, CANCEL)) {
    return escalate(
      "Un patient veut annuler son rendez-vous.",
      quote,
      `C'est noté, je transmets l'annulation au cabinet. Merci de nous avoir prévenus !${
        doctolib ? " Vous pouvez aussi l'annuler directement sur Doctolib." : ""
      }`,
      "Demande d'annulation de rendez-vous : transmise au cabinet.",
    );
  }

  // ── 4. Déplacement d'un rendez-vous existant ──
  const moving = has(t, MOVE) || (bookingInProgress && has(recentClientNorm, MOVE));
  if (moving) {
    const slot = parseSlot(req.text, now);
    if (!switchOn(req, "rendez_vous") || slot.day || !has(t, MOVE)) {
      const wish = slot.day
        ? ` Nouveau créneau souhaité : ${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}.`
        : "";
      return escalate(
        "Un patient veut déplacer son rendez-vous.",
        `${quote}${wish}`,
        "C'est noté. Je transmets votre demande au cabinet, qui vous confirme le nouveau créneau très vite.",
        "Demande de changement de rendez-vous : transmise au cabinet.",
      );
    }
    return reply(
      "Bien sûr. Quel jour et quel moment vous arrangeraient pour le nouveau rendez-vous ?",
      "Un patient veut déplacer son rendez-vous.",
      "rendez_vous",
    );
  }

  // ── 5. Prise de rendez-vous ──
  const slotHere = parseSlot(req.text, now);
  const wantsBooking =
    has(t, BOOK) ||
    (bookingInProgress &&
      !has(t, HOURS) &&
      !asksAddress(t) &&
      Boolean(slotHere.day || slotHere.time || slotHere.part));
  if (wantsBooking) {
    if (!switchOn(req, "rendez_vous")) {
      return escalate(
        "Un patient demande un rendez-vous.",
        quote,
        "Je transmets votre demande de rendez-vous au cabinet, qui vous recontacte très vite.",
        "Demande de rendez-vous : transmise au cabinet.",
      );
    }

    const newPatient = has(t, NEW_PATIENT) || has(recentClientNorm, NEW_PATIENT);
    if (newPatient && !switchOn(req, "nouveaux_patients")) {
      return reply(
        "Merci de votre confiance. Le cabinet n'accueille malheureusement pas de nouveaux patients en ce moment. Nous sommes désolés de ne pas pouvoir vous recevoir.",
        "Nouveau patient informé que le cabinet ne prend personne en ce moment.",
        "rendez_vous",
      );
    }

    // Le créneau peut se construire sur plusieurs messages (« jeudi » puis « 14h »).
    const slot = slotHere.day ? slotHere : parseSlot([...recentClient, req.text].join(" "), now);
    if (!slot.time && slotHere.time) slot.time = slotHere.time;

    const who = practitionerMentioned(sp, `${recentClientNorm} ${t}`);
    const withWho = who ? ` avec ${who}` : "";
    const tag = newPatient ? " (nouveau patient)" : "";
    const bring = newPatient ? " Pensez à apporter votre carte Vitale et votre carte de mutuelle." : "";
    const online = doctolib ? " Vous pouvez aussi réserver directement sur Doctolib." : "";

    if (slot.day && isPast(slot, now)) {
      return appointment(
        "Cette date est déjà passée. Quel autre jour et quel moment vous conviendraient ?",
        "Demande de rendez-vous : date à préciser.",
        null,
      );
    }
    if (slot.day && slot.time) {
      const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
      return appointment(
        `J'ai bien noté votre demande pour ${when}${withWho}. Le cabinet vous confirme ce créneau très vite.${bring}`,
        `Demande de rendez-vous pour ${when}${withWho}${tag}, à confirmer.`,
        parisToISO(slot.day, slot.time.h, slot.time.min),
      );
    }
    if (slot.day) {
      const moment = slot.part === "matin" ? " dans la matinée" : slot.part ? " dans l'après-midi" : "";
      return appointment(
        `Très bien pour ${humanDay(slot.day)}${moment}. À quelle heure préférez-vous venir ?`,
        `Demande de rendez-vous en cours pour ${humanDay(slot.day)}${tag}.`,
        null,
      );
    }
    return appointment(
      `Avec plaisir ! Quel jour et quel moment vous conviendraient ? Dites-moi aussi en deux mots le motif (contrôle, soin, première visite…).${online}`,
      `Demande de rendez-vous${tag} : en attente d'une date.`,
      null,
    );
  }

  // ── 6. Horaires ──
  if (has(t, HOURS)) {
    const hours = a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      const extra = instructions.find((i) => /ferm|vacances|cong|horaire/i.test(i));
      return reply(
        `Le cabinet est ouvert : ${hours}.${extra ? ` ${sentence(extra)}` : ""}`,
        "Horaires donnés à un patient.",
      );
    }
    return escalate(
      "Un patient demande les horaires, qui ne sont pas renseignés.",
      quote,
      "Je vérifie les horaires du cabinet et je reviens vers vous très vite.",
      "Question sur les horaires : transmise au cabinet.",
    );
  }

  // ── 7. Adresse, accès, stationnement ──
  if (asksAddress(t)) {
    const addr = a.establishment?.address;
    const access =
      pickSpecific(sp, ["parking", "acces", "stationnement", "transport"]) ??
      instructions.find((i) => /parking|acc[eè]s|stationn|m[ée]tro|bus|tram|venir/i.test(i)) ??
      null;
    if (addr) {
      return reply(
        `Le cabinet se trouve au ${addr}.${access ? ` ${sentence(access)}` : ""}`,
        "Adresse donnée à un patient.",
      );
    }
    return escalate(
      "Un patient demande l'adresse, qui n'est pas renseignée.",
      quote,
      "Je vous envoie l'adresse exacte du cabinet dans un instant.",
      "Question sur l'adresse : transmise au cabinet.",
    );
  }

  // ── 8. Praticiens ──
  if (has(t, PRACTITIONERS)) {
    const list = splitList(sp.praticiens);
    if (list.length) {
      return reply(
        `Les praticiens du cabinet : ${list.join(", ")}. Souhaitez-vous prendre rendez-vous avec l'un d'eux ?`,
        "Praticiens présentés à un patient.",
      );
    }
    return escalate(
      "Un patient demande qui sont les praticiens.",
      quote,
      "Je vérifie et je reviens vers vous très vite.",
      "Question sur les praticiens : transmise au cabinet.",
    );
  }

  // ── 9. Consignes du patron (elles priment sur ce qui suit) ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 10. « Vous faites les implants ? » ──
  const care = CARE.find((c) => has(t, c.words));
  if (care && has(t, ASKS_IF_OFFERED)) {
    const offered = norm(sp.types_soins ?? "");
    if (offered && has(offered, care.words)) {
      return reply(
        `Oui, le cabinet propose ${care.label}. Souhaitez-vous prendre rendez-vous ?`,
        `Un patient s'est renseigné sur ${care.label}.`,
      );
    }
    // Absent de la liste ne veut pas dire « non » : on demande au cabinet.
    return escalate(
      `Un patient demande si le cabinet propose ${care.label}.`,
      quote,
      "Je vérifie auprès du cabinet et je reviens vers vous très vite.",
      `Question sur ${care.label} : transmise au cabinet.`,
    );
  }

  // ── 11. Carte Vitale, mutuelle, remboursements ──
  if (has(t, COVERAGE)) {
    return escalate(
      "Un patient pose une question sur la prise en charge (carte Vitale, mutuelle, remboursement).",
      quote,
      "Bonne question : je la transmets au cabinet, qui vous répond précisément très vite.",
      "Question sur la prise en charge : transmise au cabinet.",
    );
  }

  // ── 12. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "coucou", "allo"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux vous renseigner ou noter une demande de rendez-vous. Que puis-je faire pour vous ?`,
      "Accueil d'un patient.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien"]) && t.length < 60) {
    return reply("Avec plaisir. Belle journée à vous !", "Échange terminé avec un patient.");
  }

  // ── Sinon : il transmet, il n'invente pas ──
  return escalate(
    "Une demande de patient à traiter.",
    quote,
    "Merci pour votre message. Je le transmets au cabinet, qui vous répond très vite.",
    "Demande de patient : transmise au cabinet.",
  );
}

function practitionerMentioned(sp: Record<string, string>, normalizedText: string): string | null {
  for (const name of splitList(sp.praticiens)) {
    const tokens = norm(name)
      .split(" ")
      .filter((w) => w.length >= 3 && !["docteur", "dr", "madame", "monsieur"].includes(w));
    if (tokens.some((w) => new RegExp(`\\b${w}\\b`).test(normalizedText))) return name;
  }
  return null;
}

