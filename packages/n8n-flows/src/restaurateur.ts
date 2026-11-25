/**
 * Flux générique « Restaurant » (prêt à l'emploi, Lot 16).
 *
 * Partagé par tous les restaurants abonnés : tout ce qui est propre au
 * restaurant arrive dans la requête (établissement, spécificités du « premier
 * jour », consignes, boutons). Rien n'est stocké ici.
 *
 * Principe : il répond quand il est sûr, sinon il transmet au restaurant. Le
 * cahier de réservations n'est pas consulté : une réservation est NOTÉE
 * (`propose`) et le restaurant la confirme. Il ne garantit jamais l'absence
 * d'un allergène, n'accepte pas un groupe au-delà de la taille fixée, ne
 * promet pas de plat hors carte et ne négocie pas.
 *
 * Spécificités lues (catalogue, `personalization`) : `capacite`, `horaires`,
 * `carte`, `groupes_max`.
 * Boutons lus : `reservations` (absent = allumé), `complet` (absent = éteint :
 * seul `true` dit que le restaurant est complet aujourd'hui). Libellés par
 * défaut dans `apps/api/prisma/seed-data/catalog.ts`.
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
  parisParts,
  parisToISO,
  parseSlot,
  reply,
  sentence,
  switchOn,
  type FlowReply,
  type FlowRequest,
  type Slot,
} from "./common";

const COMPLAINT = [
  "plainte", "reclamation", "reclamer", "intoxication", "intoxique", "malade apres", "tombe malade",
  "j ai ete malade", "on a ete malades", "nous avons ete malades", "decu", "decue", "decevant", "inadmissible",
  "scandaleux", "rembourser", "remboursement", "cheveu dans", "pas frais", "avis negatif", "mauvais accueil",
];

const CANCEL = [
  "annuler", "annulation", "decommander", "ne pourrons pas venir", "ne pourrai pas venir", "ne pourra pas venir",
  "ne pouvons plus venir", "ne peux plus venir", "empeche",
];

const MOVE = [
  "decaler", "deplacer", "reporter", "changer ma reservation", "changer la reservation", "modifier ma reservation",
  "modifier la reservation", "changer l heure", "changer le nombre", "ajouter une personne",
  "ajouter deux personnes",
];

const PRIVATE_EVENT = [
  "privatis", "seminaire", "mariage", "bapteme", "communion", "enterrement de vie",
  "repas d entreprise", "repas de groupe", "comite d entreprise", "cocktail", "traiteur",
];

const BOOK = [
  "reserver", "reservation", "une table", "la table", "des tables", "table pour", "table de", "couverts",
  "place pour", "de la place", "venir manger", "venir diner", "venir dejeuner", "manger ce", "diner ce",
  "dejeuner ce",
];

const WAITLIST = ["liste d attente", "si une table se libere", "si une place se libere", "en cas de desistement"];

const ALLERGY = [
  "allerg", "intoleran", "sans gluten", "gluten", "celiaque", "lactose", "sans lait", "arachide", "cacahuete",
  "fruits a coque", "noix", "fruits de mer", "crustace", "oeuf", "sesame", "vegan", "vegetalien",
  "vegetarien", "halal", "casher", "kasher", "sans porc",
];

const HOURS = [
  "horaire", "ouvert", "ouverte", "ouverts", "ferme", "fermes", "quelle heure", "jusqu a quelle heure",
  "a partir de quelle heure", "service du", "dernier service", "derniere commande",
];
const ADDRESS = ["adresse", "ou etes vous", "ou se trouve", "comment venir", "parking", "garer", "vous situer", "acces", "metro", "bus", "tram"];
/** Tournures parlées (« c'est où ? ») — mot entier, pour ne pas lire « c'est ouvert ». */
const ADDRESS_RE = /\b(c est ou|ou est (le|votre|ce) restaurant|ou est situe|ou ca se trouve|situe ou)\b/;
const asksAddress = (t: string): boolean => has(t, ADDRESS) || ADDRESS_RE.test(t);

const MENU = [
  "carte", "menu", "plat du jour", "plats", "specialite", "qu est ce que vous servez", "que servez vous",
  "formule", "dessert", "boissons", "vins",
];

const PAYMENT = [
  "carte bancaire", "carte bleue", "cb", "ticket resto", "tickets resto", "titre restaurant", "titres restaurant",
  "cheque", "especes", "paiement", "payer", "carte cadeau", "bon cadeau",
];
const TAKEAWAY = ["a emporter", "emporter", "livraison", "livrez", "livrer", "click and collect", "uber", "deliveroo"];
const DISCOUNT = ["remise", "reduction", "promo", "geste commercial", "ristourne", "moins cher", "offert"];

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30,
};
const NUM = `(\\d{1,3}|${Object.keys(NUMBER_WORDS).join("|")})`;
/** Un nombre suivi d'une heure (« pour 20h », « à 8 heures ») n'est pas un nombre de personnes. */
const NOT_TIME = `(?!\\s*(?:h\\b|h\\d|heures?\\b|:|\\/))`;
const SIZE_PATTERNS = [
  new RegExp(`\\b${NUM}\\s*(?:personnes?|pers|couverts?|adultes?|convives?)\\b`),
  new RegExp(`\\btable (?:pour|de) ${NUM}\\b${NOT_TIME}`),
  new RegExp(`\\b(?:pour|sommes|serons|sera|seront|etre) ${NUM}\\b${NOT_TIME}`),
  /\ba (deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b(?!\s*heures?)/,
  // « venir dîner à 6 » : un verbe d'abord, sinon « à 8 » serait une heure.
  new RegExp(`\\b(?:venir|viendr[a-z]*|manger|diner|dejeuner|etre) a ${NUM}\\b${NOT_TIME}`),
];

/** Questions par lesquelles il fait avancer une réservation. */
const BOOKING_QUESTION = /combien de personnes|quel jour|quelle heure|a quel nom/;
const ASKED_NAME = /a quel nom/;

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets au restaurant, qui vous répond très vite.",
      "Message transmis au restaurant.",
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

  // ── 1. Réclamation : toujours transmise, jamais discutée ──
  if (has(t, COMPLAINT)) {
    return escalate(
      "Un client fait une réclamation.",
      quote,
      "Je suis désolé de l'apprendre. Je transmets votre message au restaurant, qui revient vers vous personnellement très vite.",
      "Réclamation d'un client : transmise au restaurant.",
    );
  }

  // ── 2. Annulation ──
  if (has(t, CANCEL)) {
    return escalate(
      "Un client annule sa réservation.",
      quote,
      "C'est noté, je transmets l'annulation au restaurant. Merci de nous avoir prévenus !",
      "Annulation de réservation : transmise au restaurant.",
    );
  }

  // ── 3. Modification d'une réservation existante ──
  if (has(t, MOVE)) {
    const slot = parseSlot(req.text, now);
    const size = partySize(t);
    const wish = [
      slot.day ? `${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}` : "",
      size ? `${size} personne${size > 1 ? "s" : ""}` : "",
    ].filter(Boolean);
    return escalate(
      "Un client veut modifier sa réservation.",
      `${quote}${wish.length ? ` Souhait : ${wish.join(", ")}.` : ""}`,
      "C'est noté. Je transmets votre demande au restaurant, qui vous confirme la modification très vite.",
      "Modification de réservation : transmise au restaurant.",
    );
  }

  // ── 4. Liste d'attente ──
  if (has(t, WAITLIST)) {
    return escalate(
      "Un client souhaite être prévenu si une table se libère.",
      quote,
      "C'est noté : je transmets votre demande au restaurant, qui vous prévient si une table se libère.",
      "Demande de liste d'attente : transmise au restaurant.",
    );
  }

  // ── 5. Privatisation, événement : le patron décide ──
  if (has(t, PRIVATE_EVENT)) {
    return escalate(
      "Une demande de privatisation ou d'événement.",
      quote,
      "Avec plaisir ! Je transmets votre demande au restaurant, qui vous recontacte pour en parler.",
      "Demande d'événement ou de privatisation : transmise au restaurant.",
    );
  }

  // ── 6. Le nom de la réservation, quand il vient de le demander ──
  if (ASKED_NAME.test(lastAssistant)) {
    const name = cleanName(req.text);
    if (name) {
      return reply(
        `Merci, c'est noté au nom de ${name}. Le restaurant vous confirme la réservation très vite.`,
        `Réservation notée au nom de ${name}, à confirmer.`,
        "rendez_vous",
      );
    }
  }

  // ── 7. Réservation ──
  const slotHere = parseSlot(req.text, now);
  const sizeHere = partySize(t) ?? (bookingInProgress ? bareNumber(t) : null);
  const wantsBooking =
    has(t, BOOK) ||
    (bookingInProgress &&
      !has(t, HOURS) &&
      !asksAddress(t) &&
      !has(t, MENU) &&
      Boolean(slotHere.day || slotHere.time || slotHere.part || sizeHere));
  if (wantsBooking) {
    return booking(req, now, { t, quote, recentClient, recentClientNorm, lastAssistant, slotHere, sizeHere });
  }

  // ── 8. Allergies, régimes : jamais de garantie, sauf consigne du patron ──
  if (has(t, ALLERGY)) {
    const matched = matchInstruction(instructions, req.text);
    if (matched) {
      return reply(
        `${sentence(matched)} Pensez à signaler toute allergie en arrivant, l'équipe en cuisine vérifiera pour vous.`,
        "Question sur un régime ou une allergie : réponse donnée grâce à une de vos consignes.",
      );
    }
    return escalate(
      "Un client pose une question sur une allergie ou un régime alimentaire.",
      quote,
      "Je préfère que la cuisine vous réponde elle-même sur ce point : je transmets votre question au restaurant, qui vous répond très vite.",
      "Question sur une allergie ou un régime : transmise au restaurant.",
    );
  }

  // ── 9. Horaires ──
  if (has(t, HOURS)) {
    const hours = sp.horaires?.trim() || a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      const extra = instructions.find((i) => /ferm|vacances|cong|horaire/i.test(i));
      return reply(
        `Nos horaires de service : ${hours}.${extra ? ` ${sentence(extra)}` : ""}`,
        "Horaires donnés à un client.",
      );
    }
    return escalate(
      "Un client demande les horaires, qui ne sont pas renseignés.",
      quote,
      "Je vérifie les horaires et je reviens vers vous très vite.",
      "Question sur les horaires : transmise au restaurant.",
    );
  }

  // ── 10. Adresse, accès, stationnement ──
  if (asksAddress(t)) {
    const addr = a.establishment?.address;
    const access = instructions.find((i) => /parking|acc[eè]s|stationn|m[ée]tro|bus|tram|venir/i.test(i)) ?? null;
    if (addr) {
      return reply(
        `Le restaurant se trouve au ${addr}.${access ? ` ${sentence(access)}` : ""}`,
        "Adresse donnée à un client.",
      );
    }
    return escalate(
      "Un client demande l'adresse, qui n'est pas renseignée.",
      quote,
      "Je vous envoie l'adresse exacte du restaurant dans un instant.",
      "Question sur l'adresse : transmise au restaurant.",
    );
  }

  // ── 11. Consignes du patron (elles priment sur ce qui suit) ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 12. Paiement, bons cadeaux : le patron répond (via une consigne, sinon ici) ──
  if (has(t, PAYMENT)) {
    return escalate(
      "Un client pose une question sur le paiement.",
      quote,
      "Je vérifie auprès du restaurant et je reviens vers vous très vite.",
      "Question sur le paiement : transmise au restaurant.",
    );
  }

  // ── 13. La carte ──
  if (has(t, MENU)) {
    const carte = sp.carte?.trim();
    if (carte) {
      const link = carte.match(/https?:\/\/\S+/)?.[0];
      return reply(
        link
          ? `Vous trouverez notre carte ici : ${link}. Souhaitez-vous réserver une table ?`
          : `Voici notre carte : ${clip(carte)}. Souhaitez-vous réserver une table ?`,
        "Carte présentée à un client.",
      );
    }
    return escalate(
      "Un client pose une question sur la carte.",
      quote,
      "Je vérifie auprès de la cuisine et je reviens vers vous très vite.",
      "Question sur la carte : transmise au restaurant.",
    );
  }

  // ── 14. Vente à emporter, remises : le patron décide ──
  if (has(t, TAKEAWAY) || has(t, DISCOUNT)) {
    return escalate(
      has(t, TAKEAWAY) ? "Un client demande de la vente à emporter ou une livraison." : "Un client demande une remise.",
      quote,
      "Je transmets votre demande au restaurant, qui vous répond très vite.",
      "Demande particulière d'un client : transmise au restaurant.",
    );
  }

  // ── 15. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "coucou", "allo"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux noter une réservation ou vous renseigner. Que puis-je faire pour vous ?`,
      "Accueil d'un client.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien", "a ce soir", "a demain"]) && t.length < 60) {
    return reply("Avec plaisir. À très bientôt !", "Échange terminé avec un client.");
  }

  // ── Sinon : il transmet, il n'invente pas ──
  return escalate(
    "Une demande de client à traiter.",
    quote,
    "Merci pour votre message. Je le transmets au restaurant, qui vous répond très vite.",
    "Demande de client : transmise au restaurant.",
  );
}

interface BookingContext {
  t: string;
  quote: string;
  recentClient: string[];
  recentClientNorm: string;
  lastAssistant: string;
  slotHere: Slot;
  sizeHere: number | null;
}

function booking(req: FlowRequest, now: Date, c: BookingContext): FlowReply {
  const sp = req.assistant.specifics ?? {};

  if (!switchOn(req, "reservations")) {
    return escalate(
      "Un client demande une réservation.",
      c.quote,
      "Je transmets votre demande de réservation au restaurant, qui vous recontacte très vite.",
      "Demande de réservation : transmise au restaurant.",
    );
  }

  // La réservation peut se construire sur plusieurs messages (« ce soir » → « 4 » → « 20h »).
  const slot = c.slotHere.day ? { ...c.slotHere } : parseSlot([...c.recentClient, req.text].join(" "), now);
  if (!slot.time && c.slotHere.time) slot.time = c.slotHere.time;
  if (!slot.part && c.slotHere.part) slot.part = c.slotHere.part;
  const size =
    c.sizeHere ??
    [...c.recentClient].reverse().map((m) => partySize(norm(m))).find((n) => n !== null) ??
    sizeEchoed(c.lastAssistant);

  // Groupe au-delà de la taille fixée par le patron (ou de la salle) : il décide.
  const groupMax = firstInt(sp.groupes_max);
  const capacity = firstInt(sp.capacite);
  const limit = groupMax ?? capacity;
  if (size && limit && size > limit) {
    return escalate(
      `Une demande de réservation pour un groupe de ${size} personnes.`,
      `${c.quote} Taille maximale fixée : ${limit} personnes.`,
      `Pour un groupe de ${size} personnes, le restaurant préfère s'organiser avec vous directement : je lui transmets votre demande, il vous recontacte très vite.`,
      `Demande de groupe (${size} personnes) : transmise au restaurant.`,
    );
  }

  if (slot.day && isPast(slot, now)) {
    return appointment(
      "Ce créneau est déjà passé. Quel autre jour et à quelle heure souhaitez-vous venir ?",
      "Demande de réservation : date à préciser.",
      null,
    );
  }

  // Complet aujourd'hui (bouton allumé par le patron).
  if (req.switches?.complet === true && slot.day && isToday(slot, now)) {
    return reply(
      "Je suis désolé, nous sommes complets aujourd'hui. Souhaitez-vous réserver pour un autre jour ? Je peux aussi demander au restaurant de vous prévenir si une table se libère.",
      "Demande pour aujourd'hui : le restaurant est complet, autre jour proposé.",
      "rendez_vous",
    );
  }

  const allergy = has(`${c.recentClientNorm} ${c.t}`, ALLERGY);
  const allergyText = allergy ? " Je transmets l'information sur l'allergie ou le régime à l'équipe." : "";
  const allergyTag = allergy ? " Allergie ou régime signalé." : "";
  const forWho = size ? `pour ${size} personne${size > 1 ? "s" : ""}` : "";
  const name = nameGiven([...c.recentClient, req.text]);

  if (slot.day && slot.time && size) {
    const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
    const named = name ? ` au nom de ${name}` : "";
    return appointment(
      `J'ai bien noté votre demande : une table ${forWho}, ${when}${named}. Le restaurant vous la confirme très vite.${allergyText}${
        name ? "" : " À quel nom dois-je noter la réservation ?"
      }`,
      `Réservation ${forWho}, ${when}${named}, à confirmer.${allergyTag}`,
      parisToISO(slot.day, slot.time.h, slot.time.min),
    );
  }

  // Il manque quelque chose : il reprend ce qu'il sait et pose UNE question.
  const lunch = /\bmidi\b/.test(`${c.recentClientNorm} ${c.t}`.replace(/apres midi/g, ""));
  const moment = slot.time ? ` à ${humanTime(slot.time)}` : lunch && !slot.part ? " au déjeuner" : momentOf(slot);
  const known = [size ? `une table ${forWho}` : "", slot.day ? `${humanDay(slot.day)}${moment}` : ""].filter(Boolean);
  const recap = known.length ? `Très bien : ${known.join(" pour ")}. ` : "Avec plaisir ! ";
  const question = !slot.day
    ? "Pour quel jour et à quelle heure souhaitez-vous réserver ?"
    : !size
      ? "Pour combien de personnes ?"
      : "À quelle heure souhaitez-vous venir ?";
  return appointment(
    `${recap}${question}`,
    `Demande de réservation en cours${known.length ? ` : ${known.join(" pour ")}` : ""}.${allergyTag}`,
    null,
  );
}

// ── Outils ───────────────────────────────────────────────────────────────────

/** Nombre de personnes dans un texte normalisé, ou null. */
export function partySize(t: string): number | null {
  for (const re of SIZE_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const n = toNumber(m[1]!);
      if (n && n > 0 && n <= 500) return n;
    }
  }
  return null;
}

/** Réponse nue à « combien de personnes ? » : « 4 », « quatre ». */
function bareNumber(t: string): number | null {
  const m = t.match(new RegExp(`^(?:on sera |nous serons |)${NUM}$`));
  return m ? toNumber(m[1]!) : null;
}

/** Nombre de personnes qu'il a lui-même repris dans sa dernière question. */
function sizeEchoed(lastAssistant: string): number | null {
  const m = lastAssistant.match(/table pour (\d{1,3}) personne/);
  return m ? Number(m[1]) : null;
}

function toNumber(s: string): number | null {
  if (/^\d+$/.test(s)) return Number(s);
  return NUMBER_WORDS[s] ?? null;
}

function firstInt(v: string | undefined): number | null {
  const m = (v ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

function isToday(slot: Slot, now: Date): boolean {
  const p = parisParts(now);
  return !!slot.day && slot.day.y === p.y && slot.day.m === p.m && slot.day.d === p.d;
}

function momentOf(slot: Slot): string {
  if (slot.part === "soir") return " au dîner";
  if (slot.part === "matin") return " dans la matinée";
  if (slot.part === "apres-midi") return " dans l'après-midi";
  return "";
}

/** « au nom de Durand » dans les messages du client. */
function nameGiven(messages: string[]): string | null {
  for (const m of [...messages].reverse()) {
    const found = m.match(/au nom de\s+([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{1,40})/i);
    if (found) return tidyName(found[1]!);
  }
  return null;
}

const NOT_A_NAME = new Set([
  "merci", "merci beaucoup", "ok", "d accord", "oui", "non", "parfait", "super", "bonjour", "bonsoir",
  "a ce soir", "a demain", "tres bien", "top", "genial",
]);

/** Réponse à « À quel nom ? » : un nom court, sans chiffres. */
function cleanName(text: string): string | null {
  const raw = text
    .trim()
    .replace(/^(c est |c'est |au nom de |le nom c est |nom\s*:\s*|monsieur |madame |m\. |mme )/i, "")
    .replace(/[.!]+$/, "");
  if (!raw || NOT_A_NAME.has(norm(raw)) || /\d/.test(raw) || raw.split(/\s+/).length > 4 || raw.length > 40) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]*$/.test(raw)) return null;
  return tidyName(raw);
}

function tidyName(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ")
    .replace(/\s+(et|pour|ce|demain|ce soir|merci)\b.*$/i, "");
}
