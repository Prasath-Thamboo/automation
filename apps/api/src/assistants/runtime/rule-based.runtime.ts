import { Injectable } from "@nestjs/common";
import type {
  AssistantRuntime,
  RuntimeContext,
  RuntimeInput,
  RuntimeReply,
} from "./assistant-runtime";
import { detectIntent, parseSlot } from "./intent";

const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Implémentation par défaut : à base de règles, sans fournisseur de modèle. Elle
 * ne répond que lorsqu'une règle correspond clairement ; sinon elle escalade.
 * Deux capacités actives (§ MVP) : « répondre aux questions courantes » et
 * « prendre un rendez-vous ». Le reste est stubbé (escalade).
 */
@Injectable()
export class RuleBasedRuntime implements AssistantRuntime {
  readonly name = "rules";

  async handle(ctx: RuntimeContext, input: RuntimeInput): Promise<RuntimeReply> {
    const { assistant, instructions } = ctx;
    const intent = detectIntent(input.text);
    const limits = (assistant.jobDescription.limits ?? []).join(" ").toLowerCase();

    // ── Garde-fous (§9.3) ────────────────────────────────────────────────
    if (intent === "urgence") {
      return this.escalate(
        assistant.name,
        "Un client signale une urgence.",
        `Message reçu : « ${clip(input.text)} ». L'assistant ne confirme jamais une urgence.`,
        "C'est noté. Je préviens tout de suite l'équipe, on vous rappelle sans attendre.",
      );
    }
    if (intent === "prix") {
      return this.escalate(
        assistant.name,
        "Un client demande un prix.",
        `Message reçu : « ${clip(input.text)} ».${
          limits.includes("prix") ? " Consigne : ne pas communiquer de prix." : ""
        }`,
        "Je transmets votre demande de tarif. Vous aurez une réponse précise très vite.",
      );
    }
    if (intent === "humain") {
      return this.escalate(
        assistant.name,
        "Un client demande à vous parler.",
        `Message reçu : « ${clip(input.text)} ».`,
        "Bien sûr, je transmets. Quelqu'un vous recontacte au plus vite.",
      );
    }

    // ── Questions courantes ──────────────────────────────────────────────
    if (intent === "salutation") {
      return this.reply(
        "Bonjour ! Je peux vous renseigner ou prendre un rendez-vous. Que puis-je faire pour vous ?",
        "questions",
        "Il a accueilli un client.",
      );
    }
    if (intent === "merci") {
      return this.reply("Avec plaisir. Belle journée !", "questions", "Il a répondu à un client.");
    }
    if (intent === "horaires") {
      const hours = assistant.establishment.openingHours || assistant.jobDescription.hours;
      if (hours) {
        return this.reply(
          `Nous sommes joignables : ${hours}.`,
          "questions",
          "Il a donné les horaires.",
        );
      }
      return this.escalate(
        assistant.name,
        "Un client demande les horaires, non renseignés.",
        `Message : « ${clip(input.text)} ». Aucun horaire n'a été renseigné.`,
        "Je vérifie nos horaires et je reviens vers vous très vite.",
      );
    }
    if (intent === "adresse") {
      const addr = assistant.establishment.address;
      if (addr) {
        const extra =
          pickSpecific(assistant.specifics, ["parking", "acces", "accès"]) ??
          instructions.find((i) => /parking|acc[eè]s|venir/i.test(i)) ??
          null;
        return this.reply(
          `Nous sommes au ${addr}.${extra ? ` ${sentence(extra)}` : ""}`,
          "questions",
          "Il a donné l'adresse.",
        );
      }
      return this.escalate(
        assistant.name,
        "Un client demande l'adresse, non renseignée.",
        `Message : « ${clip(input.text)} ».`,
        "Je vous envoie l'adresse exacte dans un instant.",
      );
    }

    // ── Prendre un rendez-vous ───────────────────────────────────────────
    if (intent === "rdv") {
      return this.book(ctx, input);
    }

    // ── Consigne du patron qui répondrait ? (correspondance simple) ──────
    const matched = instructions.find((i) => shareKeywords(i, input.text));
    if (matched) {
      return this.reply(sentence(matched), "questions", "Il a répondu grâce à une de vos consignes.");
    }

    // ── Sinon : il escalade, il n'invente pas ───────────────────────────
    return this.escalate(
      assistant.name,
      "Une demande que l'assistant n'a pas su traiter seul.",
      `Message reçu : « ${clip(input.text)} ».`,
      `Je transmets votre message à ${assistant.name}. Vous aurez une réponse rapidement.`,
    );
  }

  private book(ctx: RuntimeContext, input: RuntimeInput): RuntimeReply {
    const askedBefore = ctx.history
      .slice(-3)
      .some((m) => m.author === "assistant" && /quel jour|quel moment|créneau/i.test(m.text));

    const combined = [...ctx.history.filter((m) => m.author === "client").map((m) => m.text), input.text].join(" ");
    const slot = parseSlot(combined);

    if (slot.date && slot.hasTime) {
      const iso = slot.date.toISOString();
      return {
        kind: "appointment",
        status: "confirme",
        slotISO: iso,
        text: `C'est noté pour ${humanSlot(slot.date)}. Vous recevrez un rappel la veille. À bientôt !`,
        summary: `Il a pris un rendez-vous pour ${humanSlot(slot.date)}.`,
      };
    }
    if (slot.date) {
      return {
        kind: "appointment",
        status: "propose",
        slotISO: null,
        text: `Je peux vous proposer ${slot.dayLabel} à 10h ou à 15h. Lequel vous convient le mieux ?`,
        summary: `Il propose deux créneaux pour ${slot.dayLabel}.`,
      };
    }
    if (askedBefore) {
      return {
        kind: "appointment",
        status: "propose",
        slotISO: null,
        text: "Pas de souci. Donnez-moi un jour et un moment (par exemple « jeudi après-midi ») et je vous trouve un créneau.",
        summary: "Il attend une date pour le rendez-vous.",
      };
    }
    return {
      kind: "appointment",
      status: "propose",
      slotISO: null,
      text: "Avec plaisir. Quel jour et quel moment vous conviendraient ?",
      summary: "Un client veut un rendez-vous.",
    };
  }

  private reply(text: string, capability: string, summary: string): RuntimeReply {
    return { kind: "reply", text, capability, summary };
  }

  private escalate(name: string, question: string, context: string, ackText: string): RuntimeReply {
    return {
      kind: "escalate",
      question,
      context,
      ackText,
      summary: "Il vous a transmis une demande à valider.",
    };
  }
}

function clip(s: string): string {
  return s.length > 180 ? `${s.slice(0, 177)}…` : s;
}
function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}
function humanSlot(d: Date): string {
  const day = FR_DAYS[d.getUTCDay()]!;
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${day} ${h}h${m ? String(m).padStart(2, "0") : ""}`;
}
function pickSpecific(specifics: Record<string, string>, keys: string[]): string | null {
  for (const [k, v] of Object.entries(specifics)) {
    if (v && keys.some((key) => k.toLowerCase().includes(key))) return v;
  }
  return null;
}
const STOPWORDS = new Set([
  "quand",
  "pour",
  "avec",
  "dans",
  "cette",
  "vous",
  "nous",
  "elle",
  "leur",
  "leurs",
  "sont",
  "faire",
  "demande",
  "demandent",
  "repond",
  "reponds",
  "toujours",
  "jamais",
]);

function shareKeywords(instruction: string, message: string): boolean {
  const strip = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const words = [
    ...new Set(
      strip(instruction)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    ),
  ];
  const msg = strip(message);
  const hits = words.filter((w) => msg.includes(w));
  return hits.length >= 2;
}
