/**
 * Flux générique « Artisan du bâtiment » (prêt à l'emploi, Lot 16).
 *
 * Partagé par tous les artisans abonnés : tout ce qui est propre à l'entreprise
 * arrive dans la requête (établissement, spécificités du « premier jour »,
 * consignes, boutons). Rien n'est stocké ici.
 *
 * Principe : il note précisément chaque demande de travaux, une question à la
 * fois (nature → commune → délai souhaité → passage pour le métré →
 * coordonnées), et transmet tout de suite ce qui est urgent. Il ne chiffre
 * jamais, ne s'engage sur aucune date de démarrage et ne donne aucun avis
 * technique sur une malfaçon. Gaz, électricité, dégât des eaux : consigne de
 * sécurité d'abord.
 *
 * Spécificités lues (catalogue, `personalization`) : `specialites`, `zone`,
 * `rythme_relance` (lu par le flux planifié de relance, pas ici), `urgences`
 * (oui / non : prend-il les dépannages urgents).
 * Boutons lus : `rendez_vous` (absent = allumé), `carnet_plein` (absent =
 * éteint : seul `true` prévient que les délais sont plus longs). Libellés par
 * défaut dans `apps/api/prisma/seed-data/catalog.ts`.
 *
 * Rappel : les messages qui parlent de prix (« devis », « combien ») sont
 * traités par l'API avant d'arriver ici (garde-fou « prix ») ; ce flux traite
 * aussi les réponses aux devis, par sécurité, s'ils lui parviennent.
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
  switchOn,
  yesNo,
  type FlowReply,
  type FlowRequest,
} from "./common";

// ── Sécurité et urgences ─────────────────────────────────────────────────────

const GAS = ["odeur de gaz", "sent le gaz", "ca sent le gaz", "fuite de gaz", "odeur de gaz"];

const ELECTRIC_DANGER = [
  "etincelle", "electrocut", "fil a nu", "fils a nu", "fil denude", "fils denudes", "prise qui fume", "ca fume",
  "odeur de brule", "flamme", "court circuit", "prise qui chauffe", "prise fondue",
];

const STRUCTURE_DANGER = ["effondr", "s est effondre", "plafond qui s affaisse", "fissure qui s agrandit", "risque de chute", "menace de tomber"];

const WATER_URGENT = ["fuite d eau", "fuite", "degat des eaux", "degats des eaux", "inondation", "inonde", "ca coule", "l eau coule", "toit qui fuit", "infiltration"];

const OTHER_URGENT = [
  "plus d eau", "plus d eau chaude", "plus de chauffage", "plus d electricite", "plus de courant", "panne de courant",
  "wc bouche", "toilettes bouchees", "canalisation bouchee", "evier bouche", "porte claquee", "enferme dehors",
  "enfermee dehors", "serrure cassee", "serrure bloquee", "vitre cassee", "effraction", "cambriol", "tuile envolee",
  "tuiles envolees", "disjoncteur qui saute", "ca disjoncte",
];

const COMPLAINT = [
  "malfacon", "mal fait", "mal faits", "pas termine", "pas fini", "chantier abandonne", "retard de chantier",
  "fissure apres", "depuis vos travaux", "depuis les travaux", "apres votre passage", "garantie decennale", "decennale",
  "litige", "plainte", "reclamation", "inadmissible", "scandaleux", "decu", "decue", "rembourser",
];

const QUOTE_ACCEPT = ["bon pour accord", "j accepte le devis", "nous acceptons le devis", "devis accepte", "je valide le devis", "devis valide", "devis signe", "ok pour le devis", "d accord pour le devis", "on part sur le devis", "je signe le devis"];
const QUOTE_HESITATE = ["pas encore decide", "on reflechit", "je reflechis", "nous reflechissons", "trop cher", "autre entreprise", "autre artisan", "on ne donne pas suite", "pas donner suite", "je refuse le devis", "devis refuse"];

const CANCEL = ["annuler", "annulation", "decommander", "ne serai pas la", "ne pourrai pas etre la", "empeche"];
const MOVE = ["decaler", "deplacer le rendez", "deplacer votre passage", "reporter", "changer le rendez", "changer l heure", "un autre jour"];

/** Date de démarrage, durée de chantier : jamais d'engagement. */
const START = [
  "quand pouvez vous commencer", "quand pourriez vous commencer", "date de debut", "date de demarrage",
  "quel delai", "vos delais", "combien de temps", "quand est ce que les travaux", "duree des travaux", "duree du chantier",
];

const WORK = [
  "travaux", "refaire", "renover", "renovation", "installer", "installation", "poser", "pose de", "changer",
  "remplacer", "remplacement", "devis", "chantier", "agrandir", "amenager", "construire", "abattre", "monter un mur",
  "repeindre", "reparer", "reparation", "intervention", "venir voir", "passer voir",
];

interface Trade {
  label: string;
  keys: string[];
}

const TRADES: Trade[] = [
  { label: "salle de bain", keys: ["salle de bain", "salle d eau", "douche", "baignoire", "lavabo"] },
  { label: "cuisine", keys: ["cuisine"] },
  { label: "plomberie", keys: ["plomb", "robinet", "chauffe eau", "ballon d eau", "wc", "toilettes", "evier", "canalisation", "fuite"] },
  { label: "électricité", keys: ["electri", "prise", "tableau", "disjonct", "eclairage", "interrupteur", "luminaire"] },
  { label: "chauffage", keys: ["chaudiere", "chauffage", "radiateur", "pompe a chaleur", "clim"] },
  { label: "peinture", keys: ["peinture", "peindre", "repeindre", "enduit", "papier peint"] },
  { label: "carrelage", keys: ["carrelage", "carreler", "faience"] },
  { label: "menuiserie", keys: ["menuiserie", "porte", "fenetre", "volet", "parquet", "placard", "escalier"] },
  { label: "maçonnerie", keys: ["maconnerie", "mur", "dalle", "beton", "fissure", "terrasse", "extension", "muret"] },
  { label: "toiture", keys: ["toit", "toiture", "tuile", "gouttiere", "charpente", "zinguerie", "couverture"] },
  { label: "isolation", keys: ["isolation", "isoler", "combles", "placo", "plaquiste", "cloison"] },
  { label: "serrurerie", keys: ["serrure", "verrou", "porte blindee", "porte claquee"] },
];

const ZONE_Q = ["vous intervenez", "intervenez vous", "vous vous deplacez", "vous deplacez vous", "votre zone", "secteur", "vous venez jusqu"];
const HOURS = ["horaire", "ouvert", "ouverte", "ferme", "fermee", "jusqu a quelle heure", "joignable"];
const ADDRESS = ["adresse de l entreprise", "votre adresse", "ou etes vous", "ou se trouve", "vos locaux", "votre depot"];
const CAN_YOU =
  /\b(vous faites|faites vous|vous proposez|proposez vous|vous posez|posez vous|vous installez|installez vous|vous reparez|reparez vous|vous travaillez|vous vous occupez|est ce que vous (faites|posez|installez|reparez|proposez))\b/;

// Marqueurs de ses propres questions (texte normalisé).
const ASK_COMMUNE = /dans quelle commune se trouvent les travaux/;
const ASK_WHEN = /pour quand souhaitez vous les travaux/;
const ASK_VISIT = /passer voir le chantier pour le metre/;
const ASK_CONTACT = /a quel nom, et quelle est l adresse exacte du chantier/;
const ASK_URGENT_CONTACT = /votre nom, votre adresse et un numero/;
const PHONE_RE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/;
const CHANNELS_WITH_NUMBER = new Set(["sms", "telephone", "whatsapp"]);

export function handle(req: FlowRequest, now: Date): FlowReply {
  if (!isValidRequest(req)) {
    return escalate(
      "Un message n'a pas pu être lu.",
      "Le message est arrivé dans un format inattendu.",
      "Merci pour votre message. Je le transmets à l'artisan, qui vous répond très vite.",
      "Message transmis à l'artisan.",
    );
  }

  const a = req.assistant;
  const sp = a.specifics ?? {};
  const instructions = req.instructions ?? [];
  const history = req.history ?? [];
  const t = norm(req.text);
  const quote = `Message reçu : « ${clip(req.text)} ».`;
  const lastAssistant = norm([...history].reverse().find((m) => m.author === "assistant")?.text ?? "");
  const hasNumber = CHANNELS_WITH_NUMBER.has(req.channel);

  // ── 1. Gaz : on quitte les lieux ──
  if (has(t, GAS)) {
    return escalate(
      "URGENT — un client signale une odeur de gaz.",
      quote,
      "Par sécurité : n'actionnez aucun interrupteur, ouvrez les fenêtres, quittez les lieux et appelez Urgence Sécurité Gaz au 0 800 47 33 33 (ou le 112). Je préviens l'artisan tout de suite.",
      "URGENT : odeur de gaz signalée, consignes de sécurité données, transmis à l'artisan.",
    );
  }

  // ── 2. Danger électrique ou de structure ──
  if (has(t, ELECTRIC_DANGER) || has(t, STRUCTURE_DANGER)) {
    const electric = has(t, ELECTRIC_DANGER);
    return escalate(
      `URGENT — un client signale un danger ${electric ? "électrique" : "sur le bâti"}.`,
      quote,
      electric
        ? "Par sécurité, coupez le courant au disjoncteur général si vous pouvez le faire sans risque, et ne touchez à rien. En cas de feu ou de danger immédiat, appelez le 18 ou le 112. Je préviens l'artisan tout de suite."
        : "Par sécurité, éloignez-vous de la zone et n'y laissez entrer personne. En cas de danger immédiat, appelez le 18 ou le 112. Je préviens l'artisan tout de suite.",
      `URGENT : danger ${electric ? "électrique" : "sur le bâti"} signalé, consignes données, transmis à l'artisan.`,
    );
  }

  // ── 3. Dépannage urgent (fuite, plus d'eau, porte claquée…) ──
  if (has(t, WATER_URGENT) || has(t, OTHER_URGENT)) {
    const water = has(t, WATER_URGENT);
    const tip = water ? " En attendant, coupez l'arrivée d'eau au robinet général (souvent près du compteur)." : "";
    if (yesNo(sp.urgences) === false) {
      return escalate(
        "Une demande de dépannage urgent (l'entreprise ne fait pas de dépannage).",
        quote,
        `L'entreprise ne réalise pas de dépannage en urgence : pour une intervention immédiate, mieux vaut contacter un service de dépannage.${tip} Je transmets tout de même votre message à l'artisan.`,
        "Demande de dépannage urgent : transmise (pas de dépannage proposé).",
      );
    }
    return escalate(
      "URGENT — une demande de dépannage.",
      quote,
      `C'est noté comme intervention à traiter rapidement : je préviens l'artisan tout de suite.${tip} Pouvez-vous me donner votre nom, votre adresse et un numéro${hasNumber ? " (si ce n'est pas celui-ci)" : ""} ?`,
      "URGENT : demande de dépannage, transmise à l'artisan.",
    );
  }

  // ── 4. Malfaçon, réclamation : jamais d'avis technique ──
  if (has(t, COMPLAINT)) {
    return escalate(
      "Un client signale un problème sur des travaux réalisés.",
      quote,
      "Je suis désolé de l'apprendre. Je transmets votre message à l'artisan, qui revient vers vous personnellement très vite.",
      "Réclamation sur des travaux : transmise à l'artisan.",
    );
  }

  // ── 5. Réponse à un devis envoyé ──
  if (has(t, QUOTE_ACCEPT)) {
    return escalate(
      "Bonne nouvelle : un client accepte un devis.",
      quote,
      "Merci pour votre confiance ! Je transmets tout de suite votre accord à l'artisan, qui vous recontacte pour la suite.",
      "Devis accepté par un client : transmis à l'artisan.",
    );
  }
  if (has(t, QUOTE_HESITATE)) {
    return escalate(
      "Un client répond à un devis sans l'accepter.",
      quote,
      "Merci pour votre réponse, je la transmets à l'artisan.",
      "Réponse à un devis (pas accepté pour l'instant) : transmise à l'artisan.",
    );
  }

  // ── 6. Annulation, déplacement d'un passage ──
  if (has(t, CANCEL)) {
    return escalate(
      "Un client annule un rendez-vous.",
      quote,
      "C'est noté, je transmets l'annulation à l'artisan. Merci de nous avoir prévenus !",
      "Annulation de rendez-vous : transmise à l'artisan.",
    );
  }
  if (has(t, MOVE)) {
    const slot = parseSlot(req.text, now);
    const wish = slot.day ? ` Souhait : ${humanDay(slot.day)}${slot.time ? ` à ${humanTime(slot.time)}` : ""}.` : "";
    return escalate(
      "Un client veut déplacer un rendez-vous.",
      `${quote}${wish}`,
      "C'est noté. Je transmets votre demande à l'artisan, qui vous confirme le nouveau créneau très vite.",
      "Déplacement de rendez-vous : transmis à l'artisan.",
    );
  }

  // ── 7. Coordonnées après une urgence ──
  if (ASK_URGENT_CONTACT.test(lastAssistant)) {
    return reply(
      "Merci, c'est transmis. L'artisan vous rappelle au plus vite.",
      `Coordonnées données pour le dépannage urgent${PHONE_RE.test(req.text) ? " (numéro dans la conversation)" : ""}.`,
    );
  }

  // ── 8. Suite d'une demande de travaux en cours ──
  if ([ASK_COMMUNE, ASK_WHEN, ASK_VISIT, ASK_CONTACT].some((re) => re.test(lastAssistant))) {
    return workRequest(req, now, { t, quote, lastAssistant, hasNumber });
  }

  // ── 9. Date de démarrage, durée : jamais d'engagement ──
  if (has(t, START)) {
    return escalate(
      "Un client demande une date de démarrage ou une durée de chantier.",
      quote,
      "Cela dépend du chantier et du planning : je pose la question à l'artisan, qui vous répond très vite.",
      "Question sur un délai de chantier : transmise à l'artisan.",
    );
  }

  // ── 10. Spécialités : « vous faites… ? » ──
  const trade = tradeOf(t);
  if (CAN_YOU.test(t) && trade) {
    if (has(norm(sp.specialites ?? ""), trade.keys)) {
      return reply(
        `Oui, la ${trade.label === "salle de bain" || trade.label === "cuisine" ? `rénovation de ${trade.label}` : trade.label} fait partie de nos spécialités. Souhaitez-vous que je note votre demande ?`,
        `Question sur ${trade.label} : spécialité de l'entreprise, réponse donnée.`,
      );
    }
    return escalate(
      `Un client demande si vous faites : ${trade.label}.`,
      quote,
      "Je vérifie auprès de l'artisan et je reviens vers vous très vite.",
      "Question sur une spécialité : transmise à l'artisan.",
    );
  }

  // ── 11. Nouvelle demande de travaux ──
  const acceptsOffer = /^(oui|volontiers|d accord)\b/.test(t) && /que je note votre demande/.test(lastAssistant);
  if (has(t, WORK) || (trade && t.length > 25) || acceptsOffer) {
    return workRequest(req, now, { t, quote, lastAssistant, hasNumber });
  }

  // ── 12. Zone d'intervention ──
  if (has(t, ZONE_Q)) {
    const zone = sp.zone?.trim();
    if (zone) {
      return reply(`Nous intervenons sur cette zone : ${zone}. Souhaitez-vous que je note votre demande ?`, "Zone d'intervention donnée à un client.");
    }
  }

  // ── 13. Horaires, adresse de l'entreprise ──
  if (has(t, HOURS)) {
    const hours = a.establishment?.openingHours || a.jobDescription?.hours;
    if (hours) {
      return reply(
        `L'entreprise est joignable ${hours}. En dehors de ces horaires, je note votre demande et je la transmets.`,
        "Horaires donnés à un client.",
      );
    }
  }
  if (has(t, ADDRESS) || /\b(c est ou|ou etes vous situes)\b/.test(t)) {
    const addr = a.establishment?.address;
    if (addr) return reply(`L'entreprise est située au ${addr}.`, "Adresse de l'entreprise donnée à un client.");
  }

  // ── 14. Consignes du patron ──
  const matched = matchInstruction(instructions, req.text);
  if (matched) {
    return reply(sentence(matched), "Réponse donnée grâce à une de vos consignes.");
  }

  // ── 15. Politesse ──
  if (has(t, ["bonjour", "bonsoir", "salut", "allo"]) && t.length < 40) {
    return reply(
      `Bonjour ! Ici ${a.name}, ${a.role}. Je peux noter votre demande de travaux ou de dépannage. Que puis-je faire pour vous ?`,
      "Accueil d'un client.",
    );
  }
  if (has(t, ["merci", "parfait", "super", "d accord", "ok", "tres bien", "a bientot", "bonne journee"]) && t.length < 60) {
    return reply("Avec plaisir. À bientôt !", "Échange terminé avec un client.");
  }

  // ── Sinon : il transmet, il n'invente pas ──
  return escalate(
    "Une demande de client à traiter.",
    quote,
    "Merci pour votre message. Je le transmets à l'artisan, qui vous répond très vite.",
    "Demande de client : transmise à l'artisan.",
  );
}

interface WorkContext {
  t: string;
  quote: string;
  lastAssistant: string;
  hasNumber: boolean;
}

/**
 * Demande de travaux, une question à la fois. L'état se lit dans la
 * conversation : chaque réponse du client suit une de ses questions.
 */
function workRequest(req: FlowRequest, now: Date, c: WorkContext): FlowReply {
  const sp = req.assistant.specifics ?? {};
  const history = req.history ?? [];
  const facts = factsOf(history, req.text);
  const nature = facts.nature ?? clip(req.text);
  const trade = tradeOf(norm(nature));
  const outside = trade && sp.specialites?.trim() && !has(norm(sp.specialites), trade.keys) ? " À vérifier : hors des spécialités indiquées." : "";
  const recap = [
    `Travaux : ${nature}`,
    facts.commune ? `commune : ${facts.commune}` : "",
    facts.when ? `souhaité : ${facts.when}` : "",
  ]
    .filter(Boolean)
    .join(" ; ");
  const busy = req.switches?.carnet_plein === true;

  // 1. Commune.
  if (!facts.commune) {
    const what = trade ? `des travaux ${/^[aeiouyéè]/i.test(trade.label) ? "d'" : "de "}${trade.label}` : "votre demande de travaux";
    return reply(
      `C'est noté : ${what}. Dans quelle commune se trouvent les travaux ?`,
      `Demande de travaux en cours. ${recap}.${outside}`,
      "rendez_vous",
    );
  }

  // 2. Délai souhaité.
  if (!facts.when) {
    return reply(
      `Merci. Pour quand souhaitez-vous les travaux (au plus vite, dans le mois, d'ici quelques mois) ?`,
      `Demande de travaux en cours. ${recap}.${outside}`,
      "rendez_vous",
    );
  }

  // 3. Passage pour le métré (ou transmission si le patron gère lui-même).
  if (!switchOn(req, "rendez_vous")) {
    return escalate(
      "Une nouvelle demande de travaux.",
      `${recap}.${outside}`,
      `Merci, j'ai tout noté. Je transmets votre demande à l'artisan, qui vous recontacte très vite${c.hasNumber ? "" : " (pensez à me laisser un numéro)"}.`,
      `Nouvelle demande de travaux : ${clip(nature)}.`,
    );
  }

  const slot = facts.visitText ? parseSlot(facts.visitText, now) : null;
  if (!slot || !slot.day || !slot.time) {
    // La question reprend toujours « passer voir le chantier pour le métré » : c'est ce qui relie la réponse suivante.
    const partial = slot?.day
      ? `Très bien : ${humanDay(slot.day)}. À quelle heure l'artisan peut-il passer voir le chantier pour le métré ?`
      : "";
    return appointment(
      partial ||
        `${busy ? "Notre planning est très chargé en ce moment : les délais de démarrage sont plus longs que d'habitude. " : "Merci. "}L'artisan peut passer voir le chantier pour le métré : quel jour et à quelle heure vous arrangeraient ?`,
      `Demande de travaux : ${recap}.${busy ? " Client prévenu que les délais sont plus longs." : ""}${outside}`,
      null,
    );
  }

  if (isPast(slot, now)) {
    return appointment(
      "Ce créneau est déjà passé. L'artisan peut passer voir le chantier pour le métré : quel autre jour et à quelle heure vous arrangeraient ?",
      "Passage pour le métré : date à préciser.",
      null,
    );
  }

  // 4. Créneau donné → noté ; puis coordonnées.
  const when = `${humanDay(slot.day)} à ${humanTime(slot.time)}`;
  if (!ASK_CONTACT.test(c.lastAssistant)) {
    return appointment(
      `C'est noté : passage pour le métré ${when}. L'artisan vous le confirme très vite. À quel nom, et quelle est l'adresse exacte du chantier${c.hasNumber ? "" : " (avec un numéro pour vous joindre)"} ?`,
      `Passage pour le métré ${when}, à confirmer. ${recap}.${outside}`,
      parisToISO(slot.day, slot.time.h, slot.time.min),
    );
  }

  // 5. Coordonnées reçues.
  return reply(
    "Merci, j'ai tout noté. L'artisan vous confirme son passage très vite.",
    `Coordonnées du chantier reçues (dans la conversation). ${recap}.`,
    "rendez_vous",
  );
}

// ── Outils ───────────────────────────────────────────────────────────────────

export function tradeOf(t: string): Trade | null {
  return TRADES.find((tr) => has(t, tr.keys)) ?? null;
}

interface WorkFacts {
  nature: string | null;
  commune: string | null;
  when: string | null;
  visitText: string | null;
}

/** Relit la conversation : chaque message client qui suit une de ses questions en est la réponse. */
export function factsOf(history: FlowRequest["history"], current: string): WorkFacts {
  const turns = [...history, { author: "client" as const, text: current }];
  const facts: WorkFacts = { nature: null, commune: null, when: null, visitText: null };
  let lastQuestion = "";
  for (const turn of turns) {
    if (turn.author === "assistant") {
      lastQuestion = norm(turn.text);
      continue;
    }
    if (turn.author !== "client") continue;
    if (ASK_COMMUNE.test(lastQuestion)) facts.commune = clip(turn.text);
    else if (ASK_WHEN.test(lastQuestion)) facts.when = clip(turn.text);
    else if (ASK_VISIT.test(lastQuestion)) facts.visitText = `${facts.visitText ?? ""} ${turn.text}`.trim();
    else if (!facts.nature && (has(norm(turn.text), WORK) || tradeOf(norm(turn.text)))) facts.nature = clip(turn.text);
    lastQuestion = "";
  }
  return facts;
}
