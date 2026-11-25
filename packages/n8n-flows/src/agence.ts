/**
 * Flux générique « Agence immobilière » (prêt à l'emploi, Lot 16).
 *
 * Partagé par toutes les agences abonnées : tout ce qui est propre à l'agence
 * arrive dans la requête (établissement, spécificités du « premier jour »,
 * consignes, boutons). Rien n'est stocké ici, et le flux ne connaît pas le
 * portefeuille de biens : disponibilité, caractéristiques et adresse d'un bien
 * restent du ressort du conseiller.
 *
 * Principe : avant une visite, elle pose les questions qui trient les dossiers
 * (budget et financement pour un achat, situation et date pour une location),
 * puis NOTE la visite (`propose`) que le conseiller confirme avec l'adresse
 * exacte. Elle ne négocie jamais, ne se prononce pas sur un financement et ne
 * donne pas l'adresse d'un bien avant la confirmation.
 *
 * Spécificités lues (catalogue, `personalization`) : `secteur`, `agents`,
 * `questions_quali`, `portails`.
 * Boutons lus : `visites`, `qualification` (absents = allumés). Libellés par
 * défaut dans `apps/api/prisma/seed-data/catalog.ts`.
 *
 * Prix : le flux les traite lui-même (`asksPrice`, transmis sans chiffre) ;
 * l'API ne filtre plus les prix ni les urgences avant un flux de métier.
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
  reply,
  sentence,
  splitList,
  switchOn,
  type FlowReply,
  type FlowRequest,
  type Slot,
  asksPrice,
} from "./common";

const COMPLAINT = [
  "plainte", "reclamation", "inadmissible", "scandaleux", "decu", "decue", "pas serieux", "aucune nouvelle",
  "jamais rappele", "personne ne repond", "litige", "rembourser",
];

const CANCEL = ["annuler", "annulation", "decommander", "ne pourrai pas venir", "ne pourrai pas etre la", "ne peux plus venir", "empeche"];

const MOVE = [
  "decaler", "deplacer la visite", "deplacer ma visite", "reporter", "changer la visite", "changer ma visite",
  "changer l heure", "un autre jour", "un autre creneau",
];

/** Négociation, offre : le conseiller seul. */
const NEGOTIATE = [
  "negoci", "faire une offre", "une offre a", "une offre de", "offre d achat", "baisser le prix", "baisse de prix",
  "dernier prix", "proposer moins", "marge de negociation", "le vendeur accepterait", "prix ferme",
];

/** Vendre, louer, faire estimer son bien : demande notée pour un conseiller. */
const ESTIMATE = [
  "estimation", "estimer", "faire estimer", "vendre mon", "vendre notre", "mettre en vente", "mise en vente",
  "mettre en location", "mettre mon appartement en location", "gestion locative", "confier mon bien",
  "confier la vente", "mandat",
];

const FINANCING_QUESTION = [
  "pret immobilier", "un pret", "mon pret", "taux", "emprunt", "frais de notaire", "financer", "capacite d emprunt",
  "courtier", "est ce que la banque", "ptz", "pret a taux zero",
];

const VISIT = [
  "visiter", "visite", "voir l appartement", "voir la maison", "voir le bien", "voir le logement", "voir le studio",
  "passer voir", "toujours disponible", "encore disponible", "toujours dispo", "encore dispo", "est il disponible",
  "est elle disponible", "deja vendu", "deja loue", "interesse par", "interessee par", "votre annonce", "l annonce",
];

/** Questions sur un bien précis : le conseiller a la fiche, pas elle. */
const LISTING_DETAIL = [
  "surface", "m2", "metres carres", "etage", "ascenseur", "charges", "dpe", "diagnostic", "taxe fonciere",
  "balcon", "terrasse", "jardin", "cave", "garage", "parking du", "place de parking", "chambres", "exposition",
  "travaux", "copropriete", "chauffage", "annee de construction",
];

const PROPERTY = [
  "appartement", "maison", "le bien", "ce bien", "du bien", "votre bien", "un bien", "logement", "studio", "pieces", "t1", "t2", "t3", "t4", "t5", "f2", "f3", "f4",
  "duplex", "loft", "terrain", "annonce", "local",
];

const RENTAL = ["louer", "location", "loyer", "a louer", "bail", "colocation", "locataire"];

const SECTOR = ["secteur", "vous intervenez", "intervenez vous", "vous couvrez", "quelles villes", "quels quartiers", "sur quelle zone"];
const HOURS = ["horaire", "ouvert", "ouverte", "ferme", "fermee", "jusqu a quelle heure", "a partir de quelle heure"];
const ADDRESS = ["adresse", "ou etes vous", "ou se trouve", "comment venir", "parking", "garer", "vous situer", "acces", "quelle rue"];
const ADDRESS_RE = /\b(c est ou|ou est (l|votre|cette) agence|ou est situe|ou ca se trouve|situe ou)\b/;
const asksAddress = (t: string): boolean => has(t, ADDRESS) || ADDRESS_RE.test(t);

/** Questions par lesquelles elle fait avancer une visite. */
const QUALIFY_MARK = /pour organiser la visite/;
const DATE_QUESTION = /quel jour et a quelle heure|a quelle heure seriez vous/;
const ASKED_NAME = /a quel nom/;
const ASKED_ESTIMATE = /pour preparer le rendez vous d estimation/;
const PHONE_RE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
const CHANNELS_WITH_NUMBER = new Set(["sms", "telephone", "whatsapp"]);

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets à l'agence, qui vous répond très vite.",
      "Message transmis à l'agence.",
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
    .slice(-5)
    .map((m) => m.text);
  const assistantTurns = history.filter((m) => m.author === "assistant").map((m) => norm(m.text));
  const lastAssistant = assistantTurns[assistantTurns.length - 1] ?? "";
  // Seule sa DERNIÈRE question compte : une visite déjà notée ne doit pas être recréée au « merci » suivant.
  const visitInProgress = QUALIFY_MARK.test(lastAssistant) || DATE_QUESTION.test(lastAssistant);

  // ── 1. Réclamation : toujours transmise ──
  if (has(t, COMPLAINT)) {
    return escalate(
      "Un contact fait une réclamation.",
      quote,
      "Je suis désolée de l'apprendre. Je transmets votre message à l'agence, qui revient vers vous personnellement très vite.",
      "Réclamation d'un contact : transmise à l'agence.",
    );
  }

  // ── 2. Annulation, déplacement de visite ──
  if (has(t, CANCEL)) {
    return escalate(
      "Un contact annule sa visite.",
      quote,
      "C'est noté, je transmets l'annulation au conseiller. Merci de nous avoir prévenus !",
      "Annulation de visite : transmise à l'agence.",
    );
  }
  if (has(t, MOVE)) {
    const slot = slotOf(req.text, now);
    const wish = slot.day ? ` Souhait : ${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}.` : "";
    return escalate(
      "Un contact veut déplacer sa visite.",
      `${quote}${wish}`,
      "C'est noté. Je transmets votre demande au conseiller, qui vous confirme le nouveau créneau très vite.",
      "Déplacement de visite : transmis à l'agence.",
    );
  }

  // ── 3. Négociation, offre : jamais elle ──
  if (has(t, NEGOTIATE)) {
    return escalate(
      "Un contact souhaite faire une offre ou négocier.",
      quote,
      "Je transmets votre demande au conseiller en charge du bien, qui vous recontacte très vite pour en parler.",
      "Offre ou négociation : transmise au conseiller.",
    );
  }

  // ── 4. Demande d'estimation, de mise en vente ou en location ──
  if (ASKED_ESTIMATE.test(lastAssistant)) {
    return reply(
      "Merci, j'ajoute ces informations pour le conseiller, qui vous recontacte très vite pour fixer le rendez-vous.",
      `Précisions pour l'estimation : ${clip(req.text)}.`,
    );
  }
  if (has(t, ESTIMATE)) {
    return escalate(
      "Un propriétaire souhaite une estimation ou confier son bien.",
      quote,
      "Avec plaisir ! Je note votre demande pour un conseiller de l'agence. Pour préparer le rendez-vous d'estimation : de quel type de bien s'agit-il, dans quelle commune, et quelle surface environ ?",
      "Demande d'estimation : notée pour un conseiller.",
    );
  }

  // ── Prix : jamais de chiffre inventé, la demande est transmise ──
  if (asksPrice(t)) {
    return escalate(
      "Un contact pose une question de prix.",
      quote,
      "Je transmets votre question au conseiller, qui vous répond très vite.",
      "Question de prix : transmise au conseiller.",
    );
  }

  // ── 5. Le nom du contact, quand elle vient de le demander ──
  if (ASKED_NAME.test(lastAssistant)) {
    const name = cleanName(req.text);
    if (name) {
      const phone = PHONE_RE.test(req.text);
      return reply(
        `Merci ${name}, c'est noté. Le conseiller vous confirme la visite très vite avec l'adresse exacte.`,
        `Visite notée au nom de ${name}${phone ? " (numéro laissé dans la conversation)" : ""}, à confirmer.`,
        "rendez_vous",
      );
    }
  }

  // ── 6. Visite (avec qualification) ──
  const slotHere = slotOf(req.text, now);
  const wantsVisit =
    has(t, VISIT) ||
    (visitInProgress && !has(t, LISTING_DETAIL) && !has(t, SECTOR) && !has(t, HOURS)) ||
    (has(t, PROPERTY) && Boolean(slotHere.day));
  if (wantsVisit) {
    return visit(req, now, { t, quote, recentClient, assistantTurns, lastAssistant, slotHere });
  }

  // ── 7. Adresse d'un bien : jamais avant la confirmation ; adresse de l'agence sinon ──
  if (asksAddress(t)) {
    if (has(t, PROPERTY) && !has(t, ["agence"])) {
      return reply(
        "L'adresse exacte du bien vous est communiquée à la confirmation de la visite. Souhaitez-vous que j'organise une visite ?",
        "Adresse d'un bien demandée : communiquée à la confirmation de la visite.",
      );
    }
    const addr = a.establishment?.address;
    const access = instructions.find((i) => /parking|acc[eè]s|stationn|garer|m[ée]tro|bus|tram|venir/i.test(i)) ?? null;
    if (addr) {
      return reply(`L'agence se trouve au ${addr}.${access ? ` ${sentence(access)}` : ""}`, "Adresse de l'agence donnée à un contact.");
    }
    return escalate(
      "Un contact demande l'adresse de l'agence, qui n'est pas renseignée.",
      quote,
      "Je vous envoie l'adresse exacte de l'agence dans un instant.",
      "Question sur l'adresse : transmise à l'agence.",
    );
  }

  // ── 8. Consignes du patron (elles priment sur ce qui suit) ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 9. Financement : jamais d'avis ──
  if (has(t, FINANCING_QUESTION)) {
    return escalate(
      "Un contact pose une question sur le financement.",
      quote,
      "Je préfère qu'un conseiller vous réponde sur ce point : je lui transmets votre question, il vous recontacte très vite.",
      "Question sur le financement : transmise au conseiller.",
    );
  }

  // ── 10. Détail d'un bien : le conseiller a la fiche ──
  if (has(t, LISTING_DETAIL)) {
    return escalate(
      "Un contact pose une question sur un bien.",
      quote,
      "Je fais vérifier ce point par le conseiller en charge du bien, qui vous répond très vite.",
      "Question sur un bien : transmise au conseiller.",
    );
  }

  // ── 11. Secteur couvert ──
  if (has(t, SECTOR)) {
    const sector = sp.secteur?.trim();
    if (sector) {
      return reply(`L'agence intervient sur ce secteur : ${sector}.`, "Secteur de l'agence donné à un contact.");
    }
  }

  // ── 12. Conseillers ──
  if (has(t, ["agent", "agents", "conseiller", "conseillers", "l equipe", "qui s occupe"])) {
    const team = splitList(sp.agents);
    if (team.length) {
      return reply(
        `L'équipe de l'agence : ${joinFr(team)}. Je peux transmettre votre demande à l'un d'eux si vous le souhaitez.`,
        "Équipe de l'agence présentée à un contact.",
      );
    }
  }

  // ── 13. Horaires ──
  if (has(t, HOURS)) {
    const hours = a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      const extra = instructions.find((i) => /ferm|vacances|cong|horaire/i.test(i));
      return reply(`L'agence est ouverte ${hours}.${extra ? ` ${sentence(extra)}` : ""}`, "Horaires donnés à un contact.");
    }
    return escalate(
      "Un contact demande les horaires, qui ne sont pas renseignés.",
      quote,
      "Je vérifie les horaires et je reviens vers vous très vite.",
      "Question sur les horaires : transmise à l'agence.",
    );
  }

  // ── 14. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "allo", "hello"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux organiser une visite, noter une demande d'estimation ou vous renseigner. Que puis-je faire pour vous ?`,
      "Accueil d'un contact.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien", "a jeudi", "a samedi", "a demain"]) && t.length < 60) {
    return reply("Avec plaisir. À très bientôt !", "Échange terminé avec un contact.");
  }

  // ── Sinon : elle transmet, elle n'invente pas ──
  return escalate(
    "Une demande de contact à traiter.",
    quote,
    "Merci pour votre message. Je le transmets à l'agence, qui vous répond très vite.",
    "Demande de contact : transmise à l'agence.",
  );
}

interface VisitContext {
  t: string;
  quote: string;
  recentClient: string[];
  assistantTurns: string[];
  lastAssistant: string;
  slotHere: Slot;
}

function visit(req: FlowRequest, now: Date, c: VisitContext): FlowReply {
  const sp = req.assistant.specifics ?? {};
  const all = [...c.recentClient, req.text];
  const allText = all.join(" ");
  const allNorm = norm(allText);
  const rental = has(allNorm, RENTAL);
  const listing = clip(c.recentClient.find((m) => has(norm(m), [...VISIT, ...PROPERTY])) ?? req.text);

  if (!switchOn(req, "visites")) {
    return escalate(
      "Un contact souhaite visiter un bien.",
      c.quote,
      "Je transmets votre demande de visite au conseiller, qui vous recontacte très vite.",
      "Demande de visite : transmise à l'agence.",
    );
  }

  // Qualification : ce que le contact a déjà dit (budget, financement, situation).
  const profile = profileOf(allText, rental);
  const asked = c.assistantTurns.some((m) => QUALIFY_MARK.test(m));
  // Les questions ne sont posées qu'une fois : la réponse, quelle qu'elle soit, est transmise au conseiller.
  const qualified = !switchOn(req, "qualification") || profile.complete || asked;
  const availability = has(c.t, ["disponible", "dispo", "deja vendu", "deja loue"]) ? " Je fais confirmer la disponibilité par le conseiller." : "";

  if (!qualified) {
    const custom = splitList(sp.questions_quali).slice(0, 3);
    const questions = custom.length
      ? custom.map((q) => q.trim().replace(/[\s.?!]*$/, " ?")).join(" ")
      : rental
        ? "quelle est votre situation professionnelle (et avez-vous un garant), et pour quelle date cherchez-vous ?"
        : "quel est votre budget, et avez-vous déjà un accord de principe pour le financement ?";
    return appointment(
      `Avec plaisir !${availability} Pour organiser la visite : ${questions}`,
      `Demande de visite (${listing}) : questions de qualification posées.`,
      null,
    );
  }

  // Le créneau peut venir sur plusieurs messages.
  const slot = c.slotHere.day ? { ...c.slotHere } : slotOf(all.join(" "), now);
  if (!slot.time && c.slotHere.time) slot.time = c.slotHere.time;

  if (slot.day && isPast(slot, now)) {
    return appointment("Ce créneau est déjà passé. Quel autre jour et à quelle heure seriez-vous disponible ?", "Demande de visite : date à préciser.", null);
  }

  const profileTag = profile.summary
    ? ` ${profile.summary}`
    : QUALIFY_MARK.test(c.lastAssistant)
      ? ` Réponse aux questions : « ${clip(req.text)} ».`
      : "";

  if (slot.day && slot.time) {
    const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
    const askPhone = !CHANNELS_WITH_NUMBER.has(req.channel) && !PHONE_RE.test(allText);
    return appointment(
      `C'est noté : visite ${when}. Le conseiller vous la confirme très vite, avec l'adresse exacte du bien.${
        askPhone ? " À quel nom, et un numéro pour la confirmation ?" : " À quel nom dois-je noter la visite ?"
      }`,
      `Visite ${when} (${listing}), à confirmer.${profileTag}`,
      parisToISO(slot.day, slot.time.h, slot.time.min),
    );
  }

  const recap = slot.day ? `Très bien : ${humanDay(slot.day)}. ` : "Merci, c'est noté. ";
  const question = slot.day
    ? "À quelle heure seriez-vous disponible ?"
    : "Quel jour et à quelle heure seriez-vous disponible pour la visite ? Je vous envoie l'adresse exacte à la confirmation.";
  return appointment(`${recap}${question}`, `Demande de visite en cours (${listing}).${profileTag}`, null);
}

// ── Outils ───────────────────────────────────────────────────────────────────

/**
 * Créneau d'une visite. On retire d'abord ce qui ressemble à une date sans en
 * être une dans l'immobilier : « le 3 pièces », « 120 m² », « 240 000 € ».
 */
export function slotOf(text: string, now: Date): Slot {
  const cleaned = text
    .replace(/\b\d+\s*(?:pi[eè]ces?|chambres?|m2|m²|mètres|metres|étages?|etages?|p)\b/gi, " ")
    .replace(/\b\d{1,3}(?:[ .]\d{3})+\s*(?:€|euros?)?/gi, " ")
    .replace(/\b\d+\s*(?:€|euros?|k€|k)\b/gi, " ")
    .replace(/\b[tf]\d\b/gi, " ");
  return parseSlot(cleaned, now);
}

interface Profile {
  any: boolean;
  complete: boolean;
  summary: string;
}

/** Budget, financement (achat) ou situation (location) déclarés par le contact. */
export function profileOf(text: string, rental: boolean): Profile {
  const t = norm(text);
  const parts: string[] = [];
  const budget = budgetOf(t);
  if (budget) parts.push(`${rental ? "Loyer visé" : "Budget"} : ${budget}`);

  const financing = has(t, ["accord de principe", "accord bancaire", "accord de la banque", "pret accorde", "financement valide"])
    ? "accord de principe"
    : has(t, ["comptant", "cash", "sans pret", "sans credit", "fonds propres"])
      ? "achat comptant"
      : has(t, ["simulation", "courtier", "en cours", "rendez vous a la banque", "pas encore"])
        ? "financement en cours"
        : null;
  if (!rental && financing) parts.push(`financement : ${financing}`);

  const situation = has(t, ["cdi"])
    ? "CDI"
    : has(t, ["cdd", "interim", "independant", "freelance", "etudiant", "retraite", "fonctionnaire"])
      ? "situation précisée"
      : null;
  const guarantor = has(t, ["garant", "visale", "caution"]);
  if (rental && situation) parts.push(`situation : ${situation}`);
  if (rental && guarantor) parts.push("garant mentionné");

  const complete = rental ? Boolean(situation && (guarantor || budget)) : Boolean(budget && financing);
  return { any: parts.length > 0, complete, summary: parts.length ? `${parts.join(", ")}.` : "" };
}

/** « 240 000 € », « 240k », « 850 euros » → texte lisible, ou null. */
export function budgetOf(t: string): string | null {
  const euros = t.match(/\b(\d{1,3}(?:[ .]\d{3})+|\d{3,7})\s*(?:€|euros?\b)/);
  if (euros) return `${euros[1]!.replace(/[ .]/g, "").replace(/\B(?=(\d{3})+$)/g, " ")} €`;
  const k = t.match(/\b(\d{2,4})\s*(?:k€|k\b|mille\b)/);
  if (k) return `${(Number(k[1]) * 1000).toString().replace(/\B(?=(\d{3})+$)/g, " ")} €`;
  return null;
}

function joinFr(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

const NOT_A_NAME = new Set([
  "merci", "merci beaucoup", "ok", "d accord", "oui", "non", "parfait", "super", "bonjour", "bonsoir",
  "a jeudi", "a samedi", "a demain", "tres bien", "top",
]);

/** Réponse à « À quel nom ? » : un nom court, éventuellement suivi d'un numéro. */
function cleanName(text: string): string | null {
  const raw = text
    .replace(PHONE_RE, "")
    .trim()
    .replace(/^(c est |c'est |au nom de |le nom c est |nom\s*:\s*|monsieur |madame |m\. |mme )/i, "")
    .replace(/[\s.!,;]+$/, "")
    .trim();
  if (!raw || NOT_A_NAME.has(norm(raw)) || /\d/.test(raw) || raw.split(/\s+/).length > 4 || raw.length > 40) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]*$/.test(raw)) return null;
  return raw.split(/\s+/).slice(0, 4).join(" ");
}
