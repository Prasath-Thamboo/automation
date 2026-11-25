/**
 * Flux générique « Garage automobile » (prêt à l'emploi, Lot 16).
 *
 * Partagé par tous les garages abonnés : tout ce qui est propre au garage
 * arrive dans la requête (établissement, spécificités du « premier jour »,
 * consignes, boutons). Rien n'est stocké ici.
 *
 * Principe : il répond quand il est sûr, sinon il transmet au garage. Le
 * planning de l'atelier n'est pas consulté : un dépôt de véhicule est NOTÉ
 * (`propose`) et le garage le confirme. Il ne pose jamais de diagnostic, ne
 * donne aucun prix et ne s'engage sur aucun délai de réparation. Un danger sur
 * la route passe avant tout : consigne de sécurité + transmission immédiate.
 *
 * Spécificités lues (catalogue, `personalization`) : `prestations`, `horaires`,
 * `vehicule_pret` (oui / non), `marques`.
 * Boutons lus : `rendez_vous` (absent = allumé), `atelier_complet` (absent =
 * éteint : seul `true` dit que l'atelier est complet cette semaine). Libellés
 * par défaut dans `apps/api/prisma/seed-data/catalog.ts`.
 *
 * Rappel : les messages qui parlent de prix, de devis ou de « combien » sont
 * traités par l'API avant d'arriver ici (garde-fou « prix ») ; ce flux les
 * transmet aussi, par sécurité, s'ils lui parviennent.
 */
import {
  addDays,
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
  weekdayOf,
  yesNo,
  type FlowReply,
  type FlowRequest,
  type Slot,
  type Ymd,
} from "./common";

// ── Sécurité et urgences ─────────────────────────────────────────────────────

const DANGER = [
  "plus de frein", "n ai plus de frein", "ne freine plus", "freine plus", "freins ne repondent",
  "pedale de frein molle", "pedale molle", "pedale s enfonce", "fumee", "odeur d essence", "fuite d essence",
  "odeur de brule", "ca brule", "flamme", "voyant rouge", "voyant d huile", "voyant de temperature",
  "surchauffe", "temperature monte", "moteur chauffe", "plus de direction", "direction tres dure",
  "roue qui se detache", "accident",
];

const STUCK = [
  "ne demarre plus", "ne demarre pas", "veut plus demarrer", "batterie a plat", "batterie morte",
  "tombe en panne", "tombee en panne", "en panne sur", "suis immobilise", "bloque sur", "bloquee sur",
  "depann", "remorqu", "crevaison", "creve",
];

const COMPLAINT = [
  "plainte", "reclamation", "toujours le meme probleme", "toujours en panne", "encore en panne", "pas repare",
  "pas reparee", "mal repare", "mal reparee", "facture trop", "trop cher", "inadmissible", "scandaleux",
  "decu", "decue", "rembourser", "remboursement", "litige", "abime ma", "abime mon", "raye ma",
];

const CANCEL = [
  "annuler", "annulation", "decommander", "ne pourrai pas venir", "ne pourrai pas passer",
  "ne peux plus venir", "ne peux plus passer", "empeche",
];

const MOVE = [
  "decaler", "deplacer mon rendez", "deplacer le rendez", "reporter", "changer mon rendez", "changer le rendez",
  "modifier mon rendez", "modifier le rendez", "changer l heure", "un autre jour",
];

/** Où en est la réparation : il ne le sait pas, l'atelier répond. */
const STATUS = [
  "est prete", "est pret", "c est pret", "sera prete", "sera pret", "ou en est", "ou en sont", "avancement",
  "recuperer ma voiture", "recuperer mon vehicule", "recuperer la voiture", "recuperer le vehicule",
  "recuperer mon auto", "pieces sont arrivees", "piece est arrivee", "piece arrivee",
];

/** Délai de réparation : jamais d'engagement sans le garage. */
const DELAY = ["delai", "combien de temps", "pour quand", "garder la voiture", "garder le vehicule", "immobiliser"];

const QUOTE = ["devis", "estimation", "chiffrage", "chiffrer", "prix", "tarif", "combien"];

const BOOK = [
  "rendez vous", "rdv", "creneau", "disponibilite", "prendre date", "possible de passer", "je peux passer",
  "puis je passer", "pourrais passer", "passer au garage", "passer vous voir", "passer la deposer",
  "passer le deposer", "deposer", "amener", "emmener", "apporter la voiture", "apporter le vehicule",
  "faire la revision", "faire la vidange", "faire controler", "faire regarder", "faire verifier",
  "jeter un oeil", "jeter un coup d oeil", "faire changer", "faire monter",
];

const LOAN = [
  "vehicule de pret", "voiture de pret", "vehicule de courtoisie", "voiture de courtoisie",
  "voiture de remplacement", "vehicule de remplacement", "pret de vehicule", "pretez",
];

const DOCUMENTS = [
  "quoi apporter", "que dois je apporter", "faut il apporter", "dois je amener", "quels documents",
  "quels papiers", "documents", "papiers", "carte grise",
];

const HOURS = [
  "horaire", "ouvert", "ouverte", "ouverts", "ferme", "fermes", "quelle heure ouvr", "jusqu a quelle heure",
  "a partir de quelle heure",
];
const ADDRESS = ["adresse", "ou etes vous", "ou se trouve", "comment venir", "parking", "garer", "vous situer", "acces"];
/** Tournures parlées (« c'est où ? ») — mot entier, pour ne pas lire « c'est ouvert ». */
const ADDRESS_RE = /\b(c est ou|ou est (le|votre|ce) garage|ou est situe|ou ca se trouve|situe ou)\b/;
const asksAddress = (t: string): boolean => has(t, ADDRESS) || ADDRESS_RE.test(t);

const PAYMENT = ["carte bancaire", "carte bleue", "cb", "cheque", "especes", "paiement", "payer", "en plusieurs fois"];

/** « Vous faites… ? », « Vous prenez les… ? » */
const CAN_YOU =
  /\b(vous faites|faites vous|vous proposez|proposez vous|vous changez|changez vous|vous reparez|reparez vous|vous montez|vous prenez|prenez vous|vous travaillez sur|vous vous occupez|est ce que vous (faites|reparez|changez|prenez|montez|proposez))\b/;

// ── Prestations, pannes, véhicules ───────────────────────────────────────────

interface Service {
  label: string;
  /** Mots cherchés dans le message ET dans les prestations saisies par le garage. */
  keys: string[];
}

const SERVICES: Service[] = [
  { label: "le contrôle technique", keys: ["controle technique", "contre visite", "pre controle"] },
  { label: "la révision", keys: ["revision", "entretien"] },
  { label: "la vidange", keys: ["vidange"] },
  { label: "les pneus", keys: ["pneu", "pneumatique"] },
  { label: "les freins", keys: ["frein", "plaquette", "disques"] },
  { label: "la courroie de distribution", keys: ["distribution", "courroie"] },
  { label: "l'embrayage", keys: ["embrayage"] },
  { label: "la climatisation", keys: ["clim"] },
  { label: "la carrosserie", keys: ["carrosserie", "bosse", "peinture", "pare choc"] },
  { label: "le diagnostic", keys: ["diagnostic", "diag", "valise"] },
  { label: "la batterie", keys: ["batterie"] },
  { label: "l'échappement", keys: ["echappement", "pot d echappement"] },
  { label: "le parallélisme", keys: ["parallelisme", "geometrie"] },
  { label: "les amortisseurs", keys: ["amortisseur"] },
  { label: "le pare-brise", keys: ["pare brise", "vitrage"] },
];

interface Symptom {
  label: string;
  keys: string[];
  /** Question posée pour préparer l'intervention (jamais de diagnostic). */
  question: string;
}

const SYMPTOMS: Symptom[] = [
  {
    label: "un bruit",
    keys: ["bruit", "grince", "grincement", "claque", "claquement", "siffle", "sifflement", "frotte", "frottement", "cogne"],
    question:
      "le bruit ressemble plutôt à un grincement, un frottement ou un claquement ? Et quand apparaît-il (au freinage, en tournant, à froid…) ?",
  },
  {
    label: "un voyant allumé",
    keys: ["voyant", "temoin"],
    question: "de quelle couleur est le voyant, et à quoi ressemble son symbole ? Est-il fixe ou clignotant ?",
  },
  {
    label: "une fuite",
    keys: ["fuite", "fuit", "flaque", "goutte"],
    question: "de quelle couleur est le liquide, et à quel endroit sous le véhicule (avant, arrière, au milieu) ?",
  },
  {
    label: "des vibrations",
    keys: ["vibr", "tremble"],
    question: "les vibrations se sentent-elles dans le volant ou dans tout le véhicule ? À partir de quelle vitesse environ ?",
  },
  {
    label: "un problème de démarrage",
    keys: ["demarre mal", "a du mal a demarrer", "cale", "broute", "perte de puissance", "a des a coups"],
    question: "cela arrive-t-il surtout à froid, ou tout le temps ? Un voyant s'allume-t-il au tableau de bord ?",
  },
];

const BRANDS = [
  "renault", "peugeot", "citroen", "dacia", "volkswagen", "vw", "audi", "bmw", "mercedes", "toyota", "nissan",
  "ford", "opel", "fiat", "kia", "hyundai", "skoda", "seat", "cupra", "tesla", "volvo", "mini", "suzuki",
  "mazda", "honda", "jeep", "alfa romeo", "lexus", "porsche", "land rover", "smart", "mitsubishi", "ds",
];
const ENERGIES = ["electrique", "hybride", "gpl", "diesel", "essence"];

/** Questions par lesquelles il fait avancer un rendez-vous. */
const BOOKING_QUESTION = /quel jour|quelle heure|pour quelle intervention|pour bien preparer l intervention|que je note un rendez vous/;
const ASKED_MOTIF = /pour quelle intervention/;
const ASKED_QUALIFY = /pour bien preparer l intervention/;
const ASKED_VEHICLE = /la marque et le nom du vehicule/;

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets au garage, qui vous répond très vite.",
      "Message transmis au garage.",
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
  const allClient = [...recentClient, req.text];
  const lastAssistant = norm([...history].reverse().find((m) => m.author === "assistant")?.text ?? "");
  const vehicle = vehicleInfo(allClient);
  const vehicleTag = vehicle ? ` Véhicule : ${vehicle}.` : "";
  const qualifiedBefore = history.some((m) => m.author === "assistant" && ASKED_QUALIFY.test(norm(m.text)));

  // ── 1. Danger sur la route : sécurité d'abord, transmis tout de suite ──
  if (has(t, DANGER)) {
    return escalate(
      "Un client signale un problème qui peut être dangereux sur la route.",
      `${quote}${vehicleTag}`,
      "Par sécurité, ne roulez pas avec le véhicule : arrêtez-vous dès que possible dans un endroit sûr. En cas d'accident ou de danger immédiat, appelez le 112. Je préviens le garage tout de suite, il vous rappelle très vite.",
      "Problème potentiellement dangereux signalé : transmis au garage en priorité.",
    );
  }

  // ── 2. Véhicule immobilisé : le garage rappelle pour organiser la suite ──
  if (has(t, STUCK)) {
    return escalate(
      "Un client a un véhicule immobilisé et a besoin d'aide.",
      `${quote}${vehicleTag}`,
      "Je préviens le garage tout de suite : il vous rappelle très vite pour organiser la suite. Si vous êtes au bord d'une route, mettez-vous en sécurité derrière la glissière avec votre gilet.",
      "Véhicule immobilisé : transmis au garage, à rappeler.",
    );
  }

  // ── 3. Réclamation : toujours transmise, jamais discutée ──
  if (has(t, COMPLAINT)) {
    return escalate(
      "Un client fait une réclamation.",
      `${quote}${vehicleTag}`,
      "Je suis désolé de l'apprendre. Je transmets votre message au garage, qui revient vers vous personnellement très vite.",
      "Réclamation d'un client : transmise au garage.",
    );
  }

  // ── 4. Annulation ──
  if (has(t, CANCEL)) {
    return escalate(
      "Un client annule son rendez-vous.",
      quote,
      "C'est noté, je transmets l'annulation au garage. Merci de nous avoir prévenus !",
      "Annulation de rendez-vous : transmise au garage.",
    );
  }

  // ── 5. Déplacement d'un rendez-vous ──
  if (has(t, MOVE)) {
    const slot = parseSlot(req.text, now);
    const wish = slot.day ? ` Souhait : ${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}.` : "";
    return escalate(
      "Un client veut déplacer son rendez-vous.",
      `${quote}${wish}`,
      "C'est noté. Je transmets votre demande au garage, qui vous confirme le nouveau créneau très vite.",
      "Déplacement de rendez-vous : transmis au garage.",
    );
  }

  // ── 6. Où en est le véhicule : l'atelier répond ──
  if (has(t, STATUS)) {
    return escalate(
      "Un client demande où en est son véhicule.",
      `${quote}${vehicleTag}`,
      "Je me renseigne auprès de l'atelier et je reviens vers vous très vite.",
      "Question sur l'avancement d'une réparation : transmise au garage.",
    );
  }

  // ── 7. Délai de réparation : jamais d'engagement ──
  if (has(t, DELAY)) {
    return escalate(
      "Un client demande un délai de réparation.",
      `${quote}${vehicleTag}`,
      "Le délai dépend de l'intervention et des pièces : je pose la question à l'atelier, qui vous répond très vite.",
      "Question sur un délai de réparation : transmise au garage.",
    );
  }

  // ── 8. Prix, devis : jamais de chiffre, le garage prépare le devis ──
  if (has(t, QUOTE) && !has(t, BOOK)) {
    const motif = motifOf(allClient);
    return escalate(
      "Un client demande un devis.",
      `${quote}${motif ? ` Intervention : ${motif}.` : ""}${vehicleTag}`,
      vehicle
        ? "Je transmets votre demande de devis au garage, qui vous répond très vite."
        : "Je transmets votre demande de devis au garage, qui vous répond très vite. Pour gagner du temps, pouvez-vous m'indiquer la marque et le nom du véhicule (par exemple Renault Clio), son année et son kilométrage ?",
      "Demande de devis : transmise au garage.",
    );
  }
  if (ASKED_VEHICLE.test(lastAssistant) && vehicleInfo([req.text])) {
    return reply(
      "Merci, j'ajoute ces informations à votre demande. Le garage revient vers vous très vite.",
      `Informations du véhicule ajoutées à la demande de devis : ${vehicleInfo([req.text])}.`,
    );
  }

  const slotHere = parseSlot(req.text, now);

  // ── 9. Le motif du rendez-vous, quand il vient de le demander ──
  if (ASKED_MOTIF.test(lastAssistant) && !slotHere.day && !slotHere.time) {
    return reply(
      "Merci, c'est noté pour le mécanicien. Le garage vous confirme le rendez-vous très vite.",
      `Motif du rendez-vous : ${clip(req.text)}.`,
      "rendez_vous",
    );
  }

  // ── 10. Rendez-vous (dépôt du véhicule) ──
  const bookingInProgress = BOOKING_QUESTION.test(lastAssistant);
  const aboutCar = Boolean(serviceOf(t) || symptomOf(t));
  const wantsBooking =
    has(t, BOOK) ||
    (aboutCar && Boolean(slotHere.day) && !CAN_YOU.test(t)) ||
    (bookingInProgress &&
      !has(t, HOURS) &&
      !asksAddress(t) &&
      Boolean(slotHere.day || slotHere.time || slotHere.part || /^(oui|ok|d accord|volontiers)\b/.test(t)));
  if (wantsBooking) {
    return booking(req, now, { t, quote, recentClient, allClient, lastAssistant, slotHere, vehicleTag, qualifiedBefore });
  }

  // ── 11. Réponse à la question de préparation : il propose le dépôt ──
  if (ASKED_QUALIFY.test(lastAssistant)) {
    return reply(
      "Merci, c'est noté pour le mécanicien. Quel jour et à quelle heure pourriez-vous déposer le véhicule ?",
      `Panne décrite par un client : ${clip(req.text)}.${vehicleTag}`,
      "rendez_vous",
    );
  }

  // ── 12. Véhicule de prêt ──
  if (has(t, LOAN)) {
    const loan = yesNo(sp.vehicule_pret);
    if (loan === true) {
      return reply(
        "Oui, nous pouvons vous prêter un véhicule pendant l'intervention, selon les disponibilités. Précisez-le en prenant rendez-vous et le garage vous le confirme.",
        "Question sur le véhicule de prêt : réponse donnée.",
      );
    }
    if (loan === false) {
      return reply(
        "Nous ne proposons pas de véhicule de prêt. Souhaitez-vous que je note un rendez-vous ?",
        "Question sur le véhicule de prêt : pas de véhicule de prêt, réponse donnée.",
      );
    }
    return escalate(
      "Un client demande s'il peut avoir un véhicule de prêt.",
      quote,
      "Je vérifie auprès du garage et je reviens vers vous très vite.",
      "Question sur le véhicule de prêt : transmise au garage.",
    );
  }

  // ── 13. « Vous faites… ? », « Vous prenez les… ? » ──
  const brand = brandOf(t) ?? ENERGIES.find((e) => has(t, [e])) ?? null;
  const service = serviceOf(t);
  if (CAN_YOU.test(t) && (brand || service)) {
    if (service) {
      const offered = has(norm(sp.prestations ?? ""), service.keys);
      if (offered) {
        return reply(
          `Oui, ${service.label} fait partie de nos prestations. Souhaitez-vous que je note un rendez-vous ?`,
          `Question sur ${service.label} : prestation proposée, réponse donnée.`,
        );
      }
    } else if (brand) {
      const marques = norm(`${sp.marques ?? ""} ${sp.prestations ?? ""}`);
      if (has(marques, [brand]) || /\b(toutes (les )?marques|toute marque|multimarque)/.test(marques)) {
        return reply(
          "Oui, nous prenons en charge ce type de véhicule. Souhaitez-vous que je note un rendez-vous ?",
          "Question sur une marque ou un type de véhicule : pris en charge, réponse donnée.",
        );
      }
    }
    // Absent de la fiche ne veut pas dire non : le garage répond.
    return escalate(
      service ? `Un client demande si vous faites ${service.label}.` : "Un client demande si vous prenez en charge son véhicule.",
      `${quote}${vehicleTag}`,
      "Je vérifie auprès de l'atelier et je reviens vers vous très vite.",
      "Question sur une prestation : transmise au garage.",
    );
  }

  // ── 14. Une panne décrite : il pose UNE question pour préparer l'intervention ──
  const symptom = symptomOf(t);
  if (symptom) {
    return reply(
      `Pour bien préparer l'intervention : ${symptom.question}`,
      `Un client décrit ${symptom.label} : questions de préparation posées.${vehicleTag}`,
    );
  }

  // ── 15. Documents à apporter ──
  if (has(t, DOCUMENTS)) {
    const extra = instructions.find((i) => /apport|document|papier|carte grise|carnet/i.test(i));
    return reply(
      `Pensez à apporter la carte grise du véhicule, le carnet d'entretien pour une révision, et bien sûr les clés.${
        extra ? ` ${sentence(extra)}` : ""
      }`,
      "Documents à apporter indiqués à un client.",
    );
  }

  // ── 16. Horaires ──
  if (has(t, HOURS)) {
    const hours = sp.horaires?.trim() || a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      const extra = instructions.find((i) => /ferm|vacances|cong|horaire/i.test(i));
      return reply(`Le garage est ouvert ${hours}.${extra ? ` ${sentence(extra)}` : ""}`, "Horaires donnés à un client.");
    }
    return escalate(
      "Un client demande les horaires, qui ne sont pas renseignés.",
      quote,
      "Je vérifie les horaires et je reviens vers vous très vite.",
      "Question sur les horaires : transmise au garage.",
    );
  }

  // ── 17. Adresse, accès ──
  if (asksAddress(t)) {
    const addr = a.establishment?.address;
    const access = instructions.find((i) => /parking|acc[eè]s|stationn|garer|venir/i.test(i)) ?? null;
    if (addr) {
      return reply(`Le garage se trouve au ${addr}.${access ? ` ${sentence(access)}` : ""}`, "Adresse donnée à un client.");
    }
    return escalate(
      "Un client demande l'adresse, qui n'est pas renseignée.",
      quote,
      "Je vous envoie l'adresse exacte du garage dans un instant.",
      "Question sur l'adresse : transmise au garage.",
    );
  }

  // ── 18. Consignes du patron (elles priment sur ce qui suit) ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 19. Paiement : le garage répond (via une consigne, sinon ici) ──
  if (has(t, PAYMENT)) {
    return escalate(
      "Un client pose une question sur le paiement.",
      quote,
      "Je vérifie auprès du garage et je reviens vers vous très vite.",
      "Question sur le paiement : transmise au garage.",
    );
  }

  // ── 20. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "coucou", "allo"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux noter un rendez-vous ou vous renseigner. Que puis-je faire pour vous ?`,
      "Accueil d'un client.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien", "a demain", "bonne journee"]) && t.length < 60) {
    return reply("Avec plaisir. À bientôt !", "Échange terminé avec un client.");
  }

  // ── Sinon : il transmet, il n'invente pas ──
  return escalate(
    "Une demande de client à traiter.",
    `${quote}${vehicleTag}`,
    "Merci pour votre message. Je le transmets au garage, qui vous répond très vite.",
    "Demande de client : transmise au garage.",
  );
}

interface BookingContext {
  t: string;
  quote: string;
  recentClient: string[];
  allClient: string[];
  lastAssistant: string;
  slotHere: Slot;
  vehicleTag: string;
  qualifiedBefore: boolean;
}

function booking(req: FlowRequest, now: Date, c: BookingContext): FlowReply {
  if (!switchOn(req, "rendez_vous")) {
    return escalate(
      "Un client demande un rendez-vous.",
      `${c.quote}${c.vehicleTag}`,
      "Je transmets votre demande de rendez-vous au garage, qui vous recontacte très vite.",
      "Demande de rendez-vous : transmise au garage.",
    );
  }

  // Le rendez-vous peut se construire sur plusieurs messages (« jeudi » → « 9h »).
  const slot = c.slotHere.day ? { ...c.slotHere } : parseSlot([...c.recentClient, req.text].join(" "), now);
  if (!slot.time && c.slotHere.time) slot.time = c.slotHere.time;
  if (!slot.part && c.slotHere.part) slot.part = c.slotHere.part;

  const motif = motifOf(c.allClient);
  const symptom = symptomOf(norm(c.allClient.join(" ")));

  // Une panne décrite sans date : d'abord la question de préparation (comme un vrai accueil d'atelier).
  if (!slot.day && symptom && !c.qualifiedBefore) {
    return appointment(
      `Pour bien préparer l'intervention : ${symptom.question}`,
      `Demande de rendez-vous pour ${symptom.label} : questions de préparation posées.${c.vehicleTag}`,
      null,
    );
  }

  if (slot.day && isPast(slot, now)) {
    return appointment(
      "Ce créneau est déjà passé. Quel autre jour et à quelle heure pourriez-vous déposer le véhicule ?",
      "Demande de rendez-vous : date à préciser.",
      null,
    );
  }

  // Atelier complet cette semaine (bouton allumé par le patron).
  if (req.switches?.atelier_complet === true && (!slot.day || isThisWeek(slot.day, now))) {
    const monday = nextMonday(now);
    return reply(
      `Notre atelier est complet cette semaine. Je peux noter votre demande à partir de ${humanDay(monday)} : quel jour vous arrangerait ?`,
      "Demande de rendez-vous : atelier complet cette semaine, semaine suivante proposée.",
      "rendez_vous",
    );
  }

  const forWhat = motif ? ` pour ${motif}` : "";

  if (slot.day && slot.time) {
    const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
    return appointment(
      `J'ai bien noté votre demande : dépôt du véhicule ${when}${forWhat}. Le garage vous confirme le rendez-vous très vite. Pensez à apporter la carte grise.${
        motif ? "" : " Pour quelle intervention est-ce (révision, pneus, bruit, voyant…) ?"
      }`,
      `Rendez-vous atelier ${when}${forWhat}, à confirmer.${c.vehicleTag}`,
      parisToISO(slot.day, slot.time.h, slot.time.min),
    );
  }

  // Il manque quelque chose : il reprend ce qu'il sait et pose UNE question.
  const moment = slot.part === "matin" ? " dans la matinée" : slot.part === "apres-midi" ? " dans l'après-midi" : "";
  const known = slot.day ? `${humanDay(slot.day)}${moment}` : "";
  const recap = known ? `Très bien : ${known}${forWhat}. ` : motif ? `Avec plaisir, pour ${motif}. ` : "Avec plaisir ! ";
  const question = !slot.day
    ? "Quel jour et à quelle heure pourriez-vous déposer le véhicule ?"
    : "À quelle heure pourriez-vous déposer le véhicule ?";
  return appointment(
    `${recap}${question}`,
    `Demande de rendez-vous en cours${known ? ` : ${known}` : ""}${forWhat}.${c.vehicleTag}`,
    null,
  );
}

// ── Outils ───────────────────────────────────────────────────────────────────

function serviceOf(t: string): Service | null {
  return SERVICES.find((s) => has(t, s.keys)) ?? null;
}

function symptomOf(t: string): Symptom | null {
  return SYMPTOMS.find((s) => has(t, s.keys)) ?? null;
}

/** Ce pour quoi le client vient : une prestation nommée, sinon la panne décrite. */
export function motifOf(messages: string[]): string | null {
  const t = norm(messages.join(" "));
  return serviceOf(t)?.label ?? symptomOf(t)?.label ?? null;
}

function brandOf(t: string): string | null {
  return BRANDS.find((b) => has(t, [b]) && new RegExp(`\\b${b}\\b`).test(t)) ?? null;
}

/** « Peugeot 208, 2017, 85 000 km » à partir des messages du client, ou null. */
export function vehicleInfo(messages: string[]): string | null {
  const t = norm(messages.join(" "));
  const parts: string[] = [];
  const brand = brandOf(t);
  if (brand) {
    const model = t.match(new RegExp(`\\b${brand}\\s+([a-z]*\\d[a-z0-9]*|[a-z]{3,12})\\b`))?.[1];
    const skip = new Set(["de", "du", "qui", "avec", "est", "fait", "a", "en", "et", "pour", "que", "elle", "il"]);
    const label = brand.length <= 3 ? brand.toUpperCase() : capitalize(brand);
    parts.push(model && !skip.has(model) ? `${label} ${/\d/.test(model) ? model.toUpperCase() : capitalize(model)}` : label);
  }
  const year = t.match(/\b(19[89]\d|20[0-3]\d)\b/)?.[1];
  if (year) parts.push(year);
  const km = t.match(/\b(\d{1,3}(?:[ .]\d{3})+|\d{2,6})\s*(?:km|kms|kilometres?)\b/)?.[1];
  if (km) parts.push(`${km.replace(/[ .]/g, "").replace(/\B(?=(\d{3})+$)/g, " ")} km`);
  return parts.length ? parts.join(", ") : null;
}

function capitalize(s: string): string {
  return s.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

function mondayOf(day: Ymd): Ymd {
  return addDays(day, -((weekdayOf(day) + 6) % 7));
}

function nextMonday(now: Date): Ymd {
  const p = parisParts(now);
  return addDays(mondayOf({ y: p.y, m: p.m, d: p.d }), 7);
}

function isThisWeek(day: Ymd, now: Date): boolean {
  const next = nextMonday(now);
  return Date.UTC(day.y, day.m - 1, day.d) < Date.UTC(next.y, next.m - 1, next.d);
}
