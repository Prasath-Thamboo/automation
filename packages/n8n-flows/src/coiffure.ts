/**
 * Flux générique « Salon de coiffure » (prêt à l'emploi, Lot 16).
 *
 * Partagé par tous les salons abonnés : tout ce qui est propre au salon arrive
 * dans la requête (établissement, spécificités du « premier jour », consignes,
 * boutons). Rien n'est stocké ici.
 *
 * Principe : elle répond quand elle est sûre, sinon elle transmet au salon.
 * L'agenda n'est pas consulté : un rendez-vous est NOTÉ (`propose`) et le salon
 * le confirme. Elle ne conseille jamais une couleur ou une coupe à la place du
 * coiffeur, n'applique aucune remise et ne promet pas de créneau.
 *
 * Spécificités lues (catalogue, `personalization`) : `prestations` (une par
 * ligne, avec durée et tarif affiché si le salon les a saisis), `coiffeurs`,
 * `horaires`, `instagram`.
 * Boutons lus : `rendez_vous`, `nouvelles_clientes` (absents = allumés).
 * Libellés par défaut dans `apps/api/prisma/seed-data/catalog.ts`.
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

/** Réaction après une couleur, un soin : santé d'abord, puis le salon. */
const REACTION = [
  "reaction", "brulure", "brule", "ca brule", "ca gratte", "demangeaison", "plaques rouges", "boutons",
  "cuir chevelu irrite", "gonfle", "gonflement", "reaction allergique",
];

const COMPLAINT = [
  "plainte", "reclamation", "rate", "ratee", "pas contente", "pas content", "decue", "decu", "inadmissible",
  "scandaleux", "rembourser", "remboursement", "pas du tout ce que", "trop courte", "trop court",
  "couleur orange", "cheveux abimes", "abime mes cheveux",
];

const CANCEL = [
  "annuler", "annulation", "decommander", "ne pourrai pas venir", "ne pourrai pas etre la", "ne peux plus venir",
  "empechee", "empeche",
];

const MOVE = [
  "decaler", "deplacer mon rendez", "deplacer le rendez", "reporter", "changer mon rendez", "changer le rendez",
  "modifier mon rendez", "modifier le rendez", "changer l heure", "un autre jour",
];

const WAITLIST = ["liste d attente", "si une place se libere", "si un creneau se libere", "en cas de desistement", "un desistement"];

/** Conseil coiffure : le coiffeur répond, jamais elle. */
const ADVICE = [
  "conseill", "m irait", "ca m irait", "quelle couleur", "quelle coupe", "quel produit", "qu est ce qui irait",
  "est ce que je peux faire", "possible de passer du", "possible de faire un blond", "decoloration sur",
  "sur cheveux colores", "henne", "cheveux tres abimes", "chute de cheveux", "perte de cheveux", "allerg",
];

const EVENT = ["mariage", "mariee", "evenement", "essai coiffure", "chignon de mariee", "a domicile", "plusieurs personnes"];

const DISCOUNT = ["remise", "reduction", "promo", "geste commercial", "moins cher", "offert", "carte de fidelite", "etudiant"];

const BOOK = [
  "rendez vous", "rdv", "creneau", "disponibilite", "reserver", "reservation", "prendre date", "une place",
  "je voudrais venir", "je peux venir", "puis je venir", "passer au salon", "me faire couper",
  "me faire une", "me faire un", "me faire faire", "faire une coupe", "faire un balayage", "faire une couleur",
  "faire un brushing", "faire des meches",
];

const NEW_CLIENT = ["premiere fois", "jamais venue", "jamais venu", "nouvelle cliente", "nouveau client", "nouvelle chez vous"];

const HOURS = ["horaire", "ouvert", "ouverte", "ferme", "fermee", "jusqu a quelle heure", "a partir de quelle heure"];
const ADDRESS = ["adresse", "ou etes vous", "ou se trouve", "comment venir", "parking", "garer", "vous situer", "acces"];
/** Tournures parlées (« c'est où ? ») — mot entier, pour ne pas lire « c'est ouvert ». */
const ADDRESS_RE = /\b(c est ou|ou est (le|votre|ce) salon|ou est situe|ou ca se trouve|situe ou)\b/;
const asksAddress = (t: string): boolean => has(t, ADDRESS) || ADDRESS_RE.test(t);

const DURATION = ["duree", "ca dure", "dure combien", "prend combien de temps", "combien de temps", "temps faut il", "ca prend"];
const LIST_SERVICES = ["vos prestations", "quelles prestations", "que proposez vous", "qu est ce que vous faites", "vos services", "vos soins"];
const PAYMENT = ["carte bancaire", "carte bleue", "cb", "cheque", "especes", "paiement", "payer", "bon cadeau", "carte cadeau"];
const INSTAGRAM = ["instagram", "insta", "vos photos", "vos realisations"];

/** « Vous faites… ? » */
const CAN_YOU =
  /\b(vous faites|faites vous|vous proposez|proposez vous|vous coiffez|coiffez vous|vous prenez|prenez vous|vous vous occupez|est ce que vous (faites|proposez|prenez|coiffez))\b/;

interface Service {
  label: string;
  keys: string[];
}

const SERVICES: Service[] = [
  { label: "un balayage", keys: ["balayage", "ombre", "tie and dye"] },
  { label: "des mèches", keys: ["meche"] },
  { label: "une couleur", keys: ["couleur", "coloration", "racines", "patine", "gloss"] },
  { label: "une décoloration", keys: ["decoloration", "decolo"] },
  { label: "un lissage", keys: ["lissage", "bresilien", "keratine", "tanin"] },
  { label: "une permanente", keys: ["permanente", "boucles"] },
  { label: "un chignon", keys: ["chignon", "attache", "coiffure de soiree"] },
  { label: "une coupe enfant", keys: ["coupe enfant", "enfant", "mon fils", "ma fille"] },
  { label: "une coupe homme", keys: ["coupe homme", "homme", "degrade"] },
  { label: "une taille de barbe", keys: ["barbe"] },
  { label: "un soin", keys: ["soin", "masque"] },
  { label: "un brushing", keys: ["brushing", "mise en plis"] },
  { label: "une coupe", keys: ["coupe", "couper", "frange", "pointes", "rafraichir"] },
];

/** Questions par lesquelles elle fait avancer un rendez-vous. */
const BOOKING_QUESTION = /quel jour|quelle heure|quelle prestation|que je note un rendez vous/;
const ASKED_NAME = /a quel nom/;
const ASKED_PHONE = /un numero/;
/** Le rendez-vous vient d'être noté, en attente de confirmation par le salon. */
const CONFIRM_PENDING = /vous confirme le rendez vous/;
const PHONE_RE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
/** Canaux où le salon a déjà le numéro de la cliente. */
const CHANNELS_WITH_NUMBER = new Set(["sms", "telephone", "whatsapp"]);

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets au salon, qui vous répond très vite.",
      "Message transmis au salon.",
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
  const lastAssistant = norm([...history].reverse().find((m) => m.author === "assistant")?.text ?? "");

  // ── 1. Réaction après une prestation : santé d'abord ──
  if (has(t, REACTION) && !has(t, BOOK)) {
    return escalate(
      "Une cliente signale une réaction après une prestation.",
      quote,
      "Je suis désolée. Rincez abondamment à l'eau claire. Si la gêne persiste, consultez un pharmacien ou un médecin ; en cas de gonflement du visage ou de gêne pour respirer, appelez le 15. Je préviens le salon tout de suite.",
      "Réaction signalée après une prestation : transmise au salon en priorité.",
    );
  }

  // ── 2. Réclamation : toujours transmise, jamais discutée ──
  if (has(t, COMPLAINT)) {
    return escalate(
      "Une cliente fait une réclamation.",
      quote,
      "Je suis désolée de l'apprendre. Je transmets votre message au salon, qui revient vers vous personnellement très vite.",
      "Réclamation d'une cliente : transmise au salon.",
    );
  }

  // ── Prix : jamais de chiffre inventé, la demande est transmise ──
  if (asksPrice(t)) {
    return escalate(
      "Une cliente demande un tarif.",
      quote,
      "Je transmets votre question au salon, qui vous indique le tarif très vite.",
      "Question de tarif : transmise au salon.",
    );
  }

  // ── 3. Annulation ──
  if (has(t, CANCEL)) {
    return escalate(
      "Une cliente annule son rendez-vous.",
      quote,
      "C'est noté, je transmets l'annulation au salon. Merci de nous avoir prévenus !",
      "Annulation de rendez-vous : transmise au salon (créneau à proposer à la liste d'attente).",
    );
  }

  // ── 4. Déplacement ──
  if (has(t, MOVE)) {
    const slot = parseSlot(req.text, now);
    const wish = slot.day ? ` Souhait : ${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}.` : "";
    return escalate(
      "Une cliente veut déplacer son rendez-vous.",
      `${quote}${wish}`,
      "C'est noté. Je transmets votre demande au salon, qui vous confirme le nouveau créneau très vite.",
      "Déplacement de rendez-vous : transmis au salon.",
    );
  }

  // ── 5. Liste d'attente ──
  if (has(t, WAITLIST)) {
    return escalate(
      "Une cliente souhaite être prévenue si un créneau se libère.",
      quote,
      "C'est noté : je transmets votre demande au salon, qui vous prévient dès qu'un créneau se libère.",
      "Demande de liste d'attente : transmise au salon.",
    );
  }

  // ── 6. Conseil coiffure, événement : le coiffeur répond ──
  if (has(t, ADVICE)) {
    return escalate(
      "Une cliente demande un conseil de coiffure.",
      quote,
      "C'est une très bonne question pour votre coiffeur : je lui transmets, il vous répond très vite.",
      "Demande de conseil : transmise au salon.",
    );
  }
  if (has(t, EVENT)) {
    return escalate(
      "Une demande pour un événement (mariage, coiffure à domicile, groupe).",
      quote,
      "Avec plaisir ! Je transmets votre demande au salon, qui vous recontacte pour en parler.",
      "Demande d'événement : transmise au salon.",
    );
  }

  // ── 7. Le nom (et le numéro) du rendez-vous, quand elle vient de le demander ──
  if (ASKED_NAME.test(lastAssistant)) {
    const name = cleanName(req.text);
    if (name) {
      const phone = PHONE_RE.test(req.text);
      const phoneBefore = (req.history ?? []).some((m) => m.author === "client" && PHONE_RE.test(m.text));
      if (!phone && !phoneBefore && ASKED_PHONE.test(lastAssistant)) {
        return reply(
          `Merci ${name}, c'est noté. Et un numéro pour la confirmation ?`,
          `Rendez-vous noté au nom de ${name}, numéro demandé pour la confirmation.`,
          "rendez_vous",
        );
      }
      return reply(
        `Merci ${name}, c'est noté. Le salon vous confirme le rendez-vous très vite${phone ? " par message" : ""}.`,
        `Rendez-vous noté au nom de ${name}${phone ? " (numéro laissé dans la conversation)" : ""}, à confirmer.`,
        "rendez_vous",
      );
    }
  }

  // ── 7 bis. Le numéro, envoyé à part après le nom ──
  if (PHONE_RE.test(req.text) && (ASKED_PHONE.test(lastAssistant) || CONFIRM_PENDING.test(lastAssistant))) {
    const rest = norm(req.text.replace(PHONE_RE, "")).replace(/[^a-z]/g, "");
    if (rest.length <= 25) {
      return reply(
        "Merci, c'est noté. Le salon vous confirme le rendez-vous très vite par message.",
        "Numéro laissé dans la conversation pour la confirmation du rendez-vous.",
        "rendez_vous",
      );
    }
  }

  // ── 8. Rendez-vous ──
  const slotHere = parseSlot(req.text, now);
  const serviceHere = serviceOf(t);
  const bookingInProgress = BOOKING_QUESTION.test(lastAssistant);
  const wantsBooking =
    has(t, BOOK) ||
    (Boolean(serviceHere) && Boolean(slotHere.day || slotHere.time) && !CAN_YOU.test(t)) ||
    (bookingInProgress &&
      !has(t, HOURS) &&
      !asksAddress(t) &&
      Boolean(slotHere.day || slotHere.time || slotHere.part || serviceHere || /^(oui|ok|d accord|volontiers)\b/.test(t)));
  if (wantsBooking) {
    return booking(req, now, { t, quote, recentClient, slotHere });
  }

  // ── 9. Durée d'une prestation (depuis la fiche) ──
  if (has(t, DURATION)) {
    const line = serviceHere ? serviceLine(sp.prestations, serviceHere) : null;
    if (line) {
      return reply(`${sentence(line)} Souhaitez-vous que je note un rendez-vous ?`, `Durée de ${serviceHere!.label} donnée à une cliente.`);
    }
    return escalate(
      "Une cliente demande la durée d'une prestation.",
      quote,
      "Je vérifie auprès du salon et je reviens vers vous très vite.",
      "Question sur la durée d'une prestation : transmise au salon.",
    );
  }

  // ── 10. « Vous faites… ? » ──
  if (CAN_YOU.test(t) && serviceHere) {
    const line = serviceLine(sp.prestations, serviceHere);
    if (line) {
      return reply(
        `Oui, nous proposons ${serviceHere.label} (${clip(line)}). Souhaitez-vous que je note un rendez-vous ?`,
        `Question sur ${serviceHere.label} : prestation proposée, réponse donnée.`,
      );
    }
    // Absent de la fiche ne veut pas dire non : le salon répond.
    return escalate(
      `Une cliente demande si vous proposez ${serviceHere.label}.`,
      quote,
      "Je vérifie auprès du salon et je reviens vers vous très vite.",
      "Question sur une prestation : transmise au salon.",
    );
  }

  // ── 11. Liste des prestations ──
  if (has(t, LIST_SERVICES)) {
    const list = splitPrestations(sp.prestations);
    if (list.length) {
      return reply(
        `Voici nos prestations : ${clip(list.join(" · "))}. Souhaitez-vous que je note un rendez-vous ?`,
        "Prestations présentées à une cliente.",
      );
    }
    return escalate(
      "Une cliente demande la liste des prestations, qui n'est pas renseignée.",
      quote,
      "Je vérifie auprès du salon et je reviens vers vous très vite.",
      "Question sur les prestations : transmise au salon.",
    );
  }

  // ── 12. Coiffeurs ──
  if (has(t, ["coiffeur", "coiffeuse", "coiffeurs", "qui coiffe", "l equipe"])) {
    const team = splitList(sp.coiffeurs);
    if (team.length) {
      return reply(
        `Au salon, vous serez coiffée par ${joinFr(team)}. Souhaitez-vous un rendez-vous avec l'un d'eux ?`,
        "Équipe du salon présentée à une cliente.",
      );
    }
  }

  // ── 13. Horaires ──
  if (has(t, HOURS)) {
    const hours = sp.horaires?.trim() || a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      const extra = instructions.find((i) => /ferm|vacances|cong|horaire/i.test(i));
      return reply(`Le salon est ouvert ${hours}.${extra ? ` ${sentence(extra)}` : ""}`, "Horaires donnés à une cliente.");
    }
    return escalate(
      "Une cliente demande les horaires, qui ne sont pas renseignés.",
      quote,
      "Je vérifie les horaires et je reviens vers vous très vite.",
      "Question sur les horaires : transmise au salon.",
    );
  }

  // ── 14. Adresse, accès ──
  if (asksAddress(t)) {
    const addr = a.establishment?.address;
    const access = instructions.find((i) => /parking|acc[eè]s|stationn|garer|m[ée]tro|bus|tram|venir/i.test(i)) ?? null;
    if (addr) {
      return reply(`Le salon se trouve au ${addr}.${access ? ` ${sentence(access)}` : ""}`, "Adresse donnée à une cliente.");
    }
    return escalate(
      "Une cliente demande l'adresse, qui n'est pas renseignée.",
      quote,
      "Je vous envoie l'adresse exacte du salon dans un instant.",
      "Question sur l'adresse : transmise au salon.",
    );
  }

  // ── 15. Compte Instagram ──
  if (has(t, INSTAGRAM) && sp.instagram?.trim()) {
    const account = sp.instagram.trim().replace(/^@?/, "@");
    return reply(`Vous trouverez nos réalisations sur Instagram : ${account}.`, "Compte Instagram donné à une cliente.");
  }

  // ── 16. Consignes de la patronne (elles priment sur ce qui suit) ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 17. Paiement, remises : le salon décide ──
  if (has(t, PAYMENT) || has(t, DISCOUNT)) {
    return escalate(
      has(t, DISCOUNT) ? "Une cliente demande une remise." : "Une cliente pose une question sur le paiement.",
      quote,
      "Je vérifie auprès du salon et je reviens vers vous très vite.",
      "Question sur le paiement ou une remise : transmise au salon.",
    );
  }

  // ── 18. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "coucou", "allo", "hello"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux noter un rendez-vous ou vous renseigner. Que puis-je faire pour vous ?`,
      "Accueil d'une cliente.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien", "a samedi", "a demain", "top"]) && t.length < 60) {
    return reply("Avec plaisir. À bientôt au salon !", "Échange terminé avec une cliente.");
  }

  // ── Sinon : elle transmet, elle n'invente pas ──
  return escalate(
    "Une demande de cliente à traiter.",
    quote,
    "Merci pour votre message. Je le transmets au salon, qui vous répond très vite.",
    "Demande de cliente : transmise au salon.",
  );
}

interface BookingContext {
  t: string;
  quote: string;
  recentClient: string[];
  slotHere: Slot;
}

function booking(req: FlowRequest, now: Date, c: BookingContext): FlowReply {
  const sp = req.assistant.specifics ?? {};

  if (!switchOn(req, "rendez_vous")) {
    return escalate(
      "Une cliente demande un rendez-vous.",
      c.quote,
      "Je transmets votre demande de rendez-vous au salon, qui vous recontacte très vite.",
      "Demande de rendez-vous : transmise au salon.",
    );
  }

  const all = [...c.recentClient, req.text];
  const allNorm = norm(all.join(" "));
  if (has(allNorm, NEW_CLIENT) && !switchOn(req, "nouvelles_clientes")) {
    return reply(
      "Merci beaucoup pour votre message. Le salon ne prend malheureusement pas de nouvelles clientes en ce moment. Je transmets tout de même votre demande, au cas où une place se libérerait.",
      "Nouvelle cliente : le salon ne prend pas de nouvelles clientes pour le moment, réponse donnée.",
    );
  }

  // Le rendez-vous peut se construire sur plusieurs messages (« samedi » → « un balayage » → « 10h »).
  const slot = c.slotHere.day ? { ...c.slotHere } : parseSlot(all.join(" "), now);
  if (!slot.time && c.slotHere.time) slot.time = c.slotHere.time;
  if (!slot.part && c.slotHere.part) slot.part = c.slotHere.part;

  if (slot.day && isPast(slot, now)) {
    return appointment(
      "Ce créneau est déjà passé. Quel autre jour et à quelle heure souhaitez-vous venir ?",
      "Demande de rendez-vous : date à préciser.",
      null,
    );
  }

  const service = [...all].reverse().map((m) => serviceOf(norm(m))).find(Boolean) ?? null;
  const team = splitList(sp.coiffeurs);
  const stylist = team.find((name) => allNorm.includes(norm(name).replace(/^(mme|m|mr)\.?\s+/, ""))) ?? null;
  const withWho = stylist ? ` avec ${stylist}` : "";
  const what = service ? service.label : "";
  const newTag = has(allNorm, NEW_CLIENT) ? " Nouvelle cliente." : "";
  const name = nameGiven(all);

  if (slot.day && slot.time && service) {
    const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
    const askPhone = !CHANNELS_WITH_NUMBER.has(req.channel) && !PHONE_RE.test(all.join(" "));
    const ask = name
      ? askPhone
        ? " Pouvez-vous me laisser un numéro pour la confirmation ?"
        : ""
      : askPhone
        ? " À quel nom, et un numéro pour la confirmation ?"
        : " À quel nom dois-je noter le rendez-vous ?";
    return appointment(
      `Parfait, je note ${what} ${when}${withWho}${name ? ` au nom de ${name}` : ""}. Le salon vous confirme le rendez-vous très vite.${ask}`,
      `Rendez-vous : ${what} ${when}${withWho}${name ? ` au nom de ${name}` : ""}, à confirmer.${newTag}`,
      parisToISO(slot.day, slot.time.h, slot.time.min),
    );
  }

  // Il manque quelque chose : elle reprend ce qu'elle sait et pose UNE question.
  const moment = slot.part === "matin" ? " dans la matinée" : slot.part === "apres-midi" ? " dans l'après-midi" : slot.part === "soir" ? " en fin de journée" : "";
  const known = [what, slot.day ? `${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : moment}` : "", withWho.trim()]
    .filter(Boolean)
    .join(" ");
  const recap = known ? `Très bien : ${known}. ` : "Avec plaisir ! ";
  const question = !service
    ? "Pour quelle prestation (coupe, couleur, balayage, brushing…) ?"
    : !slot.day
      ? "Quel jour et à quelle heure souhaitez-vous venir ?"
      : "À quelle heure souhaitez-vous venir ?";
  return appointment(`${recap}${question}`, `Demande de rendez-vous en cours${known ? ` : ${known}` : ""}.${newTag}`, null);
}

// ── Outils ───────────────────────────────────────────────────────────────────

export function serviceOf(t: string): Service | null {
  return SERVICES.find((s) => has(t, s.keys)) ?? null;
}

function splitPrestations(v: string | undefined): string[] {
  return (v ?? "")
    .split(/[\n;•]+/)
    .flatMap((line) => (line.includes(":") || /\d/.test(line) ? [line] : line.split(",")))
    .map((s) => s.trim().replace(/^[-*]\s*/, ""))
    .filter((s) => s.length > 1);
}

/** Ligne des prestations saisies qui correspond au service (« Balayage : 2h30 »), ou null. */
export function serviceLine(prestations: string | undefined, service: Service): string | null {
  return splitPrestations(prestations).find((line) => has(norm(line), service.keys)) ?? null;
}

function joinFr(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** « au nom de Durand » dans les messages de la cliente. */
function nameGiven(messages: string[]): string | null {
  for (const m of [...messages].reverse()) {
    const found = m.match(/au nom de\s+([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{1,40})/i);
    if (found) return tidyName(found[1]!);
  }
  return null;
}

const NOT_A_NAME = new Set([
  "merci", "merci beaucoup", "ok", "d accord", "oui", "non", "parfait", "super", "bonjour", "bonsoir",
  "a samedi", "a demain", "tres bien", "top", "genial",
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
  return tidyName(raw);
}

function tidyName(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ")
    .replace(/\s+(et|pour|ce|demain|samedi|merci)\b.*$/i, "");
}
