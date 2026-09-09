import { randomBytes, createHash } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Assistant } from "@prisma/client";
import type { InboundResult, RuntimeTurn } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService } from "../queue/queue.module";
import { PushService } from "../notifications/push.service";
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
}

@Injectable()
export class RuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly push: PushService,
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

  /** Demande entrante d'un canal (§6bis / Lot 7 câblera les vrais canaux). */
  async inbound(
    publicId: string,
    channel: string,
    from: string,
    text: string,
  ): Promise<InboundResult> {
    const assistant = await this.prisma.assistant.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!assistant) return { status: "not_found", kind: null, reply: null };
    if (assistant.state !== "au_travail") return { status: "paused", kind: null, reply: null };

    const turn = await this.run({
      assistant,
      channel,
      externalRef: `${channel}:${sha(from)}`,
      customerLabel: "Un client",
      text,
      notify: true,
    });
    return { status: "handled", kind: turn.kind, reply: turn.reply };
  }

  // ── Cœur ────────────────────────────────────────────────────────────────

  private async run(input: RunInput): Promise<RuntimeTurn> {
    const { assistant } = input;
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

    let conversation = await this.prisma.conversation.findFirst({
      where: { assistantId: assistant.id, externalRef: input.externalRef, lastMessageAt: { gte: cutoff } },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          assistantId: assistant.id,
          organizationId: assistant.organizationId,
          channel: input.channel as Prisma.ConversationCreateInput["channel"],
          customerLabel: input.customerLabel,
          externalRef: input.externalRef,
        },
      });
    }

    const priorMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    await this.prisma.message.create({
      data: { conversationId: conversation.id, author: "client", text: input.text },
    });

    const instructions = await this.prisma.assistantInstruction.findMany({
      where: { assistantId: assistant.id, active: true },
      orderBy: { version: "asc" },
    });

    const ctx: RuntimeContext = {
      assistant: {
        id: assistant.id,
        name: assistant.name,
        role: assistant.role,
        jobDescription: (assistant.jobDescription as RuntimeContext["assistant"]["jobDescription"]) ?? {},
        establishment: (assistant.establishment as RuntimeContext["assistant"]["establishment"]) ?? {},
        specifics: (assistant.specifics as Record<string, string>) ?? {},
      },
      instructions: instructions.map((i) => i.text),
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

    if (reply.kind === "reply" || reply.kind === "appointment") {
      replyText = reply.text;
      await this.prisma.message.create({
        data: { conversationId, author: "assistant", text: reply.text },
      });
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
      if (reply.ackText) {
        await this.prisma.message.create({
          data: { conversationId, author: "assistant", text: reply.ackText },
        });
      }
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

  /** Fait passer quelques premières demandes dans le moteur, à l'activation. */
  async seedInitialActivity(assistantId: string): Promise<void> {
    const assistant = await this.prisma.assistant.findUnique({ where: { id: assistantId } });
    if (!assistant) return;
    const existing = await this.prisma.conversation.count({
      where: { assistantId, NOT: { externalRef: { startsWith: "essai:" } } },
    });
    if (existing > 0) return;

    const scripts: Array<{ channel: string; from: string; text: string }> = [
      { channel: "telephone", from: "client-1", text: "Bonjour, je voudrais prendre rendez-vous jeudi à 14h." },
      { channel: "email", from: "client-2", text: "Bonjour, quels sont vos horaires le samedi ?" },
      { channel: "instagram", from: "client-3", text: "Vous pouvez me donner un prix pour une prestation ?" },
    ];
    for (const s of scripts) {
      await this.run({
        assistant,
        channel: s.channel,
        externalRef: `${s.channel}:${sha(s.from)}`,
        customerLabel: "Un client",
        text: s.text,
        notify: false,
      });
    }
  }

  private async orgOwnerEmail(organizationId: string): Promise<string | null> {
    const m = await this.prisma.membership.findFirst({
      where: { organizationId, role: "owner", deletedAt: null },
      include: { user: true },
    });
    return m?.user.email ?? null;
  }
}

function sha(v: string): string {
  return createHash("sha256").update(v).digest("hex").slice(0, 24);
}
