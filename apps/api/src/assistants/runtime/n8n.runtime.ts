import { Inject, Injectable, Logger } from "@nestjs/common";
import { z } from "zod";
import { ENV } from "../../config/config.module";
import { n8nToken, type Env } from "../../config/env";
import type {
  AssistantRuntime,
  RuntimeContext,
  RuntimeInput,
  RuntimeReply,
} from "./assistant-runtime";
import { detectIntent } from "./intent";
import { RuleBasedRuntime } from "./rule-based.runtime";

/** Intentions toujours traitées ici, jamais confiées au flux (§9.3). */
const GUARDED_INTENTS = new Set(["urgence", "prix", "humain"]);

const MAX_TEXT = 1600;
const text = z.string().trim().min(1).max(MAX_TEXT);
const summary = z.string().trim().min(1).max(300);

/** Forme attendue de la réponse du flux n8n (contrat, voir docs/n8n/README.md). */
const n8nReplySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("reply"), text, capability: z.string().trim().min(1).max(60), summary }),
  z.object({
    kind: z.literal("escalate"),
    question: text,
    context: z.string().max(MAX_TEXT).default(""),
    ackText: z.string().max(MAX_TEXT).default(""),
    summary,
  }),
  z.object({
    kind: z.literal("appointment"),
    text,
    summary,
    slotISO: z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), "date ISO invalide")
      .nullable(),
    status: z.enum(["propose", "confirme"]),
  }),
]);

/** Corps envoyé au flux. Aucune coordonnée du client final n'y figure. */
interface N8nRequest {
  version: 2;
  channel: string;
  text: string;
  assistant: RuntimeContext["assistant"];
  instructions: string[];
  switches: Record<string, boolean>;
  history: RuntimeContext["history"];
}

/**
 * Moteur délégué au flux n8n construit pour chaque client (Lot 14). L'adresse
 * du flux est branchée par l'équipe Tando dans le back-office ; tant qu'elle ne
 * l'est pas, l'employé passe par le moteur à règles. L'API garde la main sur
 * tout le reste : canaux, escalades, notifications, facturation.
 *
 * Garde-fous structurels conservés côté API :
 * - prix, urgence, demande d'un humain → moteur à règles (escalade), sans
 *   appeler n8n ;
 * - réponse invalide, erreur ou délai dépassé → escalade (on n'invente pas).
 */
@Injectable()
export class N8nRuntime implements AssistantRuntime {
  readonly name = "n8n";
  private readonly logger = new Logger(N8nRuntime.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly rules: RuleBasedRuntime,
  ) {}

  async handle(ctx: RuntimeContext, input: RuntimeInput): Promise<RuntimeReply> {
    const url = ctx.assistant.workflowUrl;
    if (!url || GUARDED_INTENTS.has(detectIntent(input.text))) {
      return this.rules.handle(ctx, input);
    }

    const body: N8nRequest = {
      version: 2,
      channel: input.channel,
      text: input.text,
      assistant: ctx.assistant,
      instructions: ctx.instructions,
      switches: ctx.switches,
      history: ctx.history,
    };

    try {
      const raw = await this.call(url, body);
      const parsed = n8nReplySchema.safeParse(raw);
      if (!parsed.success) {
        this.logger.warn(
          `Réponse n8n invalide (assistant ${ctx.assistant.id}) : ${parsed.error.issues[0]?.message ?? "?"}`,
        );
        return fallback(input.text);
      }
      return parsed.data;
    } catch (err) {
      this.logger.warn(`Appel n8n en échec (assistant ${ctx.assistant.id}) : ${(err as Error).message}`);
      return fallback(input.text);
    }
  }

  private async call(url: string, body: N8nRequest): Promise<unknown> {
    const token = n8nToken(this.env);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(token ? { "x-tando-token": token } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.env.N8N_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`statut ${res.status}`);
    const payload: unknown = await res.json();
    // « Respond to Webhook » renvoie parfois un tableau d'items.
    return Array.isArray(payload) ? payload[0] : payload;
  }
}

function fallback(message: string): RuntimeReply {
  return {
    kind: "escalate",
    question: "Un client attend une réponse.",
    context: `Message reçu : « ${message.slice(0, 280)} ». L'assistant n'a pas pu y répondre seul.`,
    ackText: "Merci pour votre message. Je le transmets, on vous répond très vite.",
    summary: "Il vous a transmis une demande à valider.",
  };
}
