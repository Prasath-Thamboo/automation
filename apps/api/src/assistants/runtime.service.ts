import { randomBytes, createHash } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Assistant } from "@prisma/client";
import type { RuntimeTurn } from "@velekya/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queue/queue.module";
import { PushService } from "../notifications/push.service";
import { SecretBox } from "../channels/secret-box";
import { escalationNoticeEmail } from "./runtime-mail.templates";
import {
  ASSISTANT_RUNTIME,
  type AssistantRuntime,
  type RuntimeContext,
  type RuntimeReply,
} from "./runtime/assistant-runtime";

interface RunInput {
  assistant: Assistant;
  channel: string;
  externalRef: string;
  customerLabel: string;
  text: string;
  notify: boolean;
  /** Lot 12 — canal réel d'arrivée (null : essai). */
  endpointId?: string | null;
  /** Adresse de réponse en clair ; chiffrée avant stockage. */
  replyTo?: string | null;
  /** Les réponses de l'assistant partent par le canal (sinon : renvoyées à l'appelant). */
  deliverReplies?: boolean;
  /** Fil côté canal (email : sujet, Message-ID). */
  thread?: Record<string, string> | null;
}

/** Demande arrivée par un canal réel (Lot 12). */
export interface ChannelInbound {
  assistant: Assistant;
  channel: string;
  endpointId: string;
  /** Identifiant stable du client côté canal (numéro, email, id Meta, session). */
  from: string;
  replyTo: string | null;
  customerLabel: string;
  text: string;
  /** false pour le formulaire : la réponse s'affiche directement à l'écran. */
  deliverReplies: boolean;
  thread?: Record<string, string> | null;
}

export interface ChannelInboundResult {
  status: "handled" | "paused";
  kind: RuntimeTurn["kind"] | null;
  reply: string | null;
  conversationId: string;
}

@Injectable()
export class RuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly push: PushService,
    private readonly box: SecretBox,
    @Inject(ASSISTANT_RUNTIME) private readonly runtime: AssistantRuntime,
  ) {}

  get runtimeName(): string {
    return this.runtime.name;
  }

  /** Essai depuis l'espace client : fonctionne quel que soit l'état de l'assistant. */
  async simulate(
    organizationId: string,
    assistantId: string,
    text: string,
    sessionId: string | undefined,
  ): Promise<RuntimeTurn> {
    const assistant = await this.prisma.assistant.findFirst({
      where: { id: assistantId, organizationId, deletedAt: null },
    });
    if (!assistant) throw new NotFoundException("Cet assistant n'existe pas.");

    const ref = `essai:${sessionId || randomBytes(6).toString("hex")}`;
    const turn = await this.run({
      assistant,
      channel: "autre",
      externalRef: ref,
      customerLabel: "Vous (essai)",
      text,
      notify: false,
    });
    return { ...turn, sessionId: ref.slice("essai:".length) };
  }

  /**
   * Demande arrivée par un canal réel (Lot 12). Assistant en pause : le message
   * n'est pas perdu — il est gardé dans le carnet et remonté au patron.
   */
  async receive(input: ChannelInbound): Promise<ChannelInboundResult> {
    const externalRef = `${input.channel}:${sha(input.from)}`;
    const base: RunInput = {
      assistant: input.assistant,
      channel: input.channel,
      externalRef,
      customerLabel: input.customerLabel,
      text: input.text,
      notify: true,
      endpointId: input.endpointId,
      replyTo: input.replyTo,
      deliverReplies: input.deliverReplies,
      thread: input.thread ?? null,
    };

    if (input.assistant.state !== "au_travail") {
      const conversationId = await this.holdWhilePaused(base);
      return { status: "paused", kind: null, reply: null, conversationId };
    }

    const turn = await this.run(base);
    return { status: "handled", kind: turn.kind, reply: turn.reply, conversationId: turn.conversationId };
  }

  /**
   * Appel manqué (Lot 12). Consigné dans le carnet. Si un SMS peut partir
   * (`sms` fourni : numéro mobile + numéro SMS raccordé, assistant au travail),
   * il propose de poursuivre par écrit ; la réponse du client reprend le même
   * fil (référence `sms:` partagée avec le canal SMS). Sinon : à rappeler.
   */
  async missedCall(input: {
    assistant: Assistant;
    /** Numéro de l'appelant (null : masqué). */
    from: string | null;
    callerDisplay: string;
    sms: { endpointId: string; text: string } | null;
  }): Promise<void> {
    const run: RunInput = {
      assistant: input.assistant,
      channel: "telephone",
      externalRef: input.from ? `sms:${sha(input.from)}` : `telephone:${randomBytes(6).toString("hex")}`,
      customerLabel: "Un client",
      text: "Appel manqué.",
      notify: true,
      endpointId: input.sms?.endpointId ?? null,
      replyTo: input.sms ? input.from : null,
      deliverReplies: Boolean(input.sms),
    };
    const conversation = await this.conversationFor(run);
    await this.prisma.message.create({
      data: { conversationId: conversation.id, author: "client", text: run.text },
    });

    if (input.sms) {
      await this.persist(run, conversation.id, {
        kind: "reply",
        text: input.sms.text,
        capability: "appel_manque",
        summary: "Appel manqué : un SMS lui a proposé de poursuivre par écrit.",
      });
    } else if (input.from) {
      await this.persist(run, conversation.id, {
        kind: "escalate",
        ackText: "",
        question: `Appel manqué du ${input.callerDisplay} : à rappeler.`,
        context: "Il n'a pas pu lui répondre par SMS.",
        summary: "Appel manqué, à rappeler.",
      });
    } else {
      await this.persist({ ...run, notify: false }, conversation.id, {
        kind: "reply",
        text: "",
        capability: "appel_manque",
        summary: "Appel manqué d'un numéro masqué.",
      });
    }
  }

  /**
   * Lot 14 — un flux planifié (relances, rappels…) rend compte de ce qu'il a
   * fait (carnet de bord) ou transmet une question au patron (escalade notifiée).
   */
  async reportFromWorkflow(
    assistant: Assistant,
    reply: Extract<RuntimeReply, { kind: "reply" | "escalate" }>,
  ): Promise<string> {
    const run: RunInput = {
      assistant,
      channel: "autre",
      externalRef: `flux:${randomBytes(6).toString("hex")}`,
      customerLabel: "Travail planifié",
      text: "",
      notify: true,
    };
    const conversation = await this.conversationFor(run);
    await this.persist(run, conversation.id, reply);
    return conversation.id;
  }

  // ── Cœur ────────────────────────────────────────────────────────────────

  /** Retrouve le fil en cours (moins de 2 h) ou en ouvre un. */
  private async conversationFor(input: RunInput) {
    const { assistant } = input;
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const replyToEnc = input.replyTo ? this.box.seal(input.replyTo) : null;

    const existing = await this.prisma.conversation.findFirst({
      where: { assistantId: assistant.id, externalRef: input.externalRef, lastMessageAt: { gte: cutoff } },
      orderBy: { lastMessageAt: "desc" },
    });
    if (existing) {
      if (replyToEnc && input.endpointId) {
        return this.prisma.conversation.update({
          where: { id: existing.id },
          data: {
            replyToEnc,
            endpointId: input.endpointId,
            ...(input.thread ? { threadMeta: input.thread } : {}),
          },
        });
      }
      return existing;
    }
    return this.prisma.conversation.create({
      data: {
        assistantId: assistant.id,
        organizationId: assistant.organizationId,
        channel: input.channel as Prisma.ConversationUncheckedCreateInput["channel"],
        customerLabel: input.customerLabel,
        externalRef: input.externalRef,
        endpointId: input.endpointId ?? null,
        replyToEnc,
        ...(input.thread ? { threadMeta: input.thread } : {}),
      },
    });
  }

  /** Assistant en pause : on garde le message et on le remonte au patron. */
  private async holdWhilePaused(input: RunInput): Promise<string> {
    const conversation = await this.conversationFor(input);
    await this.prisma.message.create({
      data: { conversationId: conversation.id, author: "client", text: input.text },
    });
    await this.persist(input, conversation.id, {
      kind: "escalate",
      ackText: PAUSED_ACK,
      question: input.text,
      context: "Message reçu pendant la pause.",
      summary: "Message reçu pendant la pause, transmis au patron.",
    });
    return conversation.id;
  }

  private async run(input: RunInput): Promise<RuntimeTurn> {
    const { assistant } = input;
    const conversation = await this.conversationFor(input);

    const priorMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    await this.prisma.message.create({
      data: { conversationId: conversation.id, author: "client", text: input.text },
    });

    const [instructions, switches, profession] = await Promise.all([
      this.prisma.assistantInstruction.findMany({
        where: { assistantId: assistant.id, active: true },
        orderBy: { version: "asc" },
      }),
      this.prisma.assistantSwitch.findMany({ where: { assistantId: assistant.id } }),
      // Lot 16 — sans flux propre, l'employé passe par le flux générique de son métier.
      !assistant.workflowUrl && assistant.professionSlug
        ? this.prisma.profession.findUnique({
            where: { slug: assistant.professionSlug },
            select: { workflowUrl: true },
          })
        : null,
    ]);

    const ctx: RuntimeContext = {
      assistant: {
        id: assistant.id,
        name: assistant.name,
        role: assistant.role,
        professionSlug: assistant.professionSlug,
        workflowUrl: assistant.workflowUrl ?? profession?.workflowUrl ?? null,
        workflowScope: assistant.workflowUrl ? "client" : profession?.workflowUrl ? "metier" : null,
        jobDescription: (assistant.jobDescription as RuntimeContext["assistant"]["jobDescription"]) ?? {},
        establishment: (assistant.establishment as RuntimeContext["assistant"]["establishment"]) ?? {},
        specifics: (assistant.specifics as Record<string, string>) ?? {},
      },
      instructions: instructions.map((i) => i.text),
      switches: Object.fromEntries(switches.map((s) => [s.key, s.enabled])),
      history: priorMessages.map((m) => ({
        author: m.author as "client" | "assistant" | "patron",
        text: m.text,
      })),
    };

    const reply = await this.runtime.handle(ctx, { channel: input.channel, text: input.text });
    return this.persist(input, conversation.id, reply);
  }

  private async persist(
    input: RunInput,
    conversationId: string,
    reply: RuntimeReply,
  ): Promise<RuntimeTurn> {
    const assistant = input.assistant;
    let escalated = false;
    let replyText = "";
    let appointment: RuntimeTurn["appointment"] = null;

    // Lot 12 — réponses à remettre par le canal d'arrivée.
    const toDeliver: string[] = [];
    const saveReply = async (text: string): Promise<void> => {
      const msg = await this.prisma.message.create({
        data: {
          conversationId,
          author: "assistant",
          text,
          delivery: input.deliverReplies && input.replyTo ? "en_attente" : null,
        },
      });
      if (msg.delivery) toDeliver.push(msg.id);
    };

    if (reply.kind === "reply" || reply.kind === "appointment") {
      replyText = reply.text;
      if (reply.text) await saveReply(reply.text);
    }

    if (reply.kind === "appointment") {
      await this.prisma.appointment.create({
        data: {
          assistantId: assistant.id,
          organizationId: assistant.organizationId,
          conversationId,
          customerLabel: input.customerLabel,
          requestedText: input.text,
          slot: reply.slotISO ? new Date(reply.slotISO) : null,
          status: reply.status,
        },
      });
      appointment = { slot: reply.slotISO, status: reply.status };
    }

    if (reply.kind === "escalate") {
      escalated = true;
      replyText = reply.ackText;
      if (reply.ackText) await saveReply(reply.ackText);
      const escalation = await this.prisma.escalation.create({
        data: {
          assistantId: assistant.id,
          organizationId: assistant.organizationId,
          conversationId,
          question: reply.question,
          context: reply.context,
          status: "ouverte",
        },
      });
      if (input.notify) {
        const email = await this.orgOwnerEmail(assistant.organizationId);
        if (email) {
          await this.queue.enqueueEmail(escalationNoticeEmail(email, assistant.name, reply.question));
        }
        await this.push.notifyEscalation({
          organizationId: assistant.organizationId,
          assistantName: assistant.name,
          question: reply.question,
          escalationId: escalation.id,
        });
      }
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { summary: reply.summary, lastMessageAt: new Date() },
    });

    for (const id of toDeliver) await this.queue.enqueueChannelOut(id);

    await this.audit.record({
      organizationId: assistant.organizationId,
      action: reply.kind === "escalate" ? "runtime.escalated" : "runtime.replied",
      target: `assistant:${assistant.id}`,
      metadata: { runtime: this.runtime.name, kind: reply.kind, channel: input.channel },
    });

    return {
      sessionId: input.externalRef,
      conversationId,
      kind: reply.kind,
      reply: replyText,
      escalated,
      appointment,
    };
  }

  private async orgOwnerEmail(organizationId: string): Promise<string | null> {
    const m = await this.prisma.membership.findFirst({
      where: { organizationId, role: "owner", deletedAt: null },
      include: { user: true },
    });
    return m?.user.email ?? null;
  }
}

/** Accusé de réception envoyé au client quand l'assistant est en pause. */
const PAUSED_ACK =
  "Bonjour, votre message est bien reçu. Nous revenons vers vous dès que possible.";

function sha(v: string): string {
  return createHash("sha256").update(v).digest("hex").slice(0, 24);
}
