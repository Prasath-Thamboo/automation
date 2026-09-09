import { Injectable } from "@nestjs/common";
import type {
  AssistantRuntime,
  RuntimeContext,
  RuntimeInput,
  RuntimeReply,
} from "./assistant-runtime";

/** Implémentation déterministe pour les tests et les démos. */
@Injectable()
export class FakeRuntime implements AssistantRuntime {
  readonly name = "fake";

  async handle(_ctx: RuntimeContext, input: RuntimeInput): Promise<RuntimeReply> {
    const t = input.text.toLowerCase();
    if (t.includes("rendez") || t.includes("rdv")) {
      const slot = new Date("2026-01-08T14:00:00.000Z");
      return {
        kind: "appointment",
        status: "confirme",
        slotISO: slot.toISOString(),
        text: "C'est noté pour jeudi 14h.",
        summary: "Il a pris un rendez-vous (démo).",
      };
    }
    if (t.includes("prix") || t.includes("urgent")) {
      return {
        kind: "escalate",
        question: "Demande sensible (démo).",
        context: input.text,
        ackText: "Je transmets votre demande.",
        summary: "Il vous a transmis une demande à valider (démo).",
      };
    }
    if (t.includes("bonjour")) {
      return { kind: "reply", text: "Bonjour ! Comment puis-je vous aider ?", capability: "questions", summary: "Accueil (démo)." };
    }
    return {
      kind: "escalate",
      question: "Demande non cadrée (démo).",
      context: input.text,
      ackText: "Je transmets votre message.",
      summary: "Il vous a transmis une demande à valider (démo).",
    };
  }
}
