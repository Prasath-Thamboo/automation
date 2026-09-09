/**
 * Interface du moteur « employé virtuel » (§9.3). Le reste de l'application ne
 * dépend jamais d'un fournisseur de modèle : on peut changer d'implémentation
 * sans toucher au produit. Règle structurelle : quand l'assistant n'est pas sûr,
 * il escalade — il n'invente pas.
 */
export const ASSISTANT_RUNTIME = Symbol("ASSISTANT_RUNTIME");

export interface RuntimeAssistant {
  id: string;
  name: string;
  role: string;
  jobDescription: {
    summary?: string;
    tasks?: string[];
    hours?: string;
    limits?: string[];
    tone?: string;
  };
  establishment: { name?: string; address?: string; openingHours?: string };
  specifics: Record<string, string>;
}

export interface RuntimeContext {
  assistant: RuntimeAssistant;
  /** Consignes ajoutées par le client (« le former »). */
  instructions: string[];
  /** Historique de la conversation, du plus ancien au plus récent. */
  history: Array<{ author: "client" | "assistant" | "patron"; text: string }>;
}

export interface RuntimeInput {
  channel: string;
  text: string;
}

export type RuntimeReply =
  | { kind: "reply"; text: string; capability: string; summary: string }
  | {
      kind: "escalate";
      /** Ce que voit le patron. */
      question: string;
      context: string;
      /** Ce que voit le client tout de suite (« je transmets… »). Peut être vide. */
      ackText: string;
      summary: string;
    }
  | {
      kind: "appointment";
      text: string;
      summary: string;
      slotISO: string | null;
      status: "propose" | "confirme";
    };

export interface AssistantRuntime {
  readonly name: string;
  handle(ctx: RuntimeContext, input: RuntimeInput): Promise<RuntimeReply>;
}
