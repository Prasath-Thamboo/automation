import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AddInstruction,
  AssistantCard,
  AssistantDetail,
  ConversationChannel,
  ConversationDetail,
  EstablishmentInfo,
  ContactPrefs,
  Instruction,
  OnboardingStep,
  SpecificQuestion,
  TeamList,
  TodaySummary,
} from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { RuntimeService } from "../assistants/runtime.service";
import { assistantReadyEmail } from "./team-mail.templates";
import { newPublicId } from "./public-id";

type JD = { summary?: string; tasks?: string[]; hours?: string };

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly runtime: RuntimeService,
  ) {}

  /** Crée les assistants manquants pour les missions acceptées de l'organisation. */
  async ensureFromMissions(organizationId: string): Promise<void> {
    const missions = await this.prisma.mission.findMany({ where: { organizationId } });
    for (const mission of missions) {
      const exists = await this.prisma.assistant.findUnique({ where: { missionId: mission.id } });
      if (exists) continue;
      const jd = mission.jobDescription as JD;
      await this.prisma.assistant.create({
        data: {
          organizationId,
          missionId: mission.id,
          publicId: newPublicId(),
          name: "Votre assistant",
          role: "votre employé virtuel sur mesure",
          state: "en_formation",
          jobDescription: mission.jobDescription as Prisma.InputJsonValue,
          contactPrefs: { email: "", phone: "", inbox: "" },
          establishment: { name: "", address: "", openingHours: str(jd.hours) },
        },
      });
    }
  }

  async team(organizationId: string): Promise<TeamList> {
    await this.ensureFromMissions(organizationId);
    const rows = await this.prisma.assistant.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    for (const row of rows) {
      if (!row.publicId) {
        await this.prisma.assistant.update({
          where: { id: row.id },
          data: { publicId: newPublicId() },
        });
      }
    }
    return { assistants: rows.map(toCard) };
  }

  /** Vue compacte pour l'écran « Aujourd'hui » du mobile (§6bis). */
  async today(organizationId: string): Promise<TodaySummary> {
    await this.ensureFromMissions(organizationId);
    const assistants = await this.prisma.assistant.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    const nameById = new Map(assistants.map((a) => [a.id, a.name]));

    const [todayCount, weekCount, escalations, appointments] = await Promise.all([
      this.prisma.conversation.count({
        where: { organizationId, lastMessageAt: { gte: startOfToday() } },
      }),
      this.prisma.conversation.count({
        where: { organizationId, lastMessageAt: { gte: daysAgo(7) } },
      }),
      this.prisma.escalation.findMany({
        where: { organizationId, status: "ouverte" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      this.prisma.appointment.findMany({
        where: {
          organizationId,
          status: { not: "annule" },
          OR: [{ slot: null }, { slot: { gte: new Date() } }],
        },
        orderBy: [{ slot: "asc" }],
        take: 10,
      }),
    ]);

    return {
      assistants: assistants.map(toCard),
      todayCount,
      weekCount,
      openEscalations: escalations.map((e) => ({
        id: e.id,
        assistantId: e.assistantId,
        assistantName: nameById.get(e.assistantId) ?? "Votre assistant",
        question: e.question,
        createdAt: e.createdAt.toISOString(),
      })),
      upcomingAppointments: appointments.map((ap) => ({
        id: ap.id,
        assistantName: nameById.get(ap.assistantId) ?? "Votre assistant",
        customerLabel: ap.customerLabel ?? "Un client",
        slot: ap.slot ? ap.slot.toISOString() : null,
        status: ap.status as "propose" | "confirme" | "annule",
      })),
    };
  }

  async detail(organizationId: string, id: string): Promise<AssistantDetail> {
    const a = await this.getOwned(organizationId, id);

    const [instructions, conversations, escalations, appointments, todayCount, weekCount] =
      await Promise.all([
        this.prisma.assistantInstruction.findMany({
          where: { assistantId: id },
          orderBy: { version: "desc" },
        }),
        this.prisma.conversation.findMany({
          where: { assistantId: id },
          orderBy: { lastMessageAt: "desc" },
          take: 25,
        }),
        this.prisma.escalation.findMany({
          where: { assistantId: id },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        }),
        this.prisma.appointment.findMany({
          where: { assistantId: id },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        this.prisma.conversation.count({
          where: { assistantId: id, lastMessageAt: { gte: startOfToday() } },
        }),
        this.prisma.conversation.count({
          where: { assistantId: id, lastMessageAt: { gte: daysAgo(7) } },
        }),
      ]);

    const jd = a.jobDescription as JD;
    return {
      ...toCard(a),
      summary: str(jd.summary),
      tasks: Array.isArray(jd.tasks) ? jd.tasks : [],
      hours: str(jd.hours),
      establishment: readEstablishment(a.establishment),
      contactPrefs: readContactPrefs(a.contactPrefs),
      specifics: readRecord(a.specifics),
      specificQuestions: await this.specificQuestions(a.professionSlug),
      instructions: instructions.map(toInstruction),
      logbook: conversations.map((c) => ({
        id: c.id,
        channel: c.channel as ConversationChannel,
        customerLabel: c.customerLabel ?? "Un client",
        summary: c.summary ?? "",
        lastMessageAt: c.lastMessageAt.toISOString(),
      })),
      escalations: escalations.map((e) => ({
        id: e.id,
        question: e.question,
        context: e.context,
        status: e.status as "ouverte" | "repondue",
        answer: e.answer,
        answeredAt: e.answeredAt ? e.answeredAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
      appointments: appointments.map((ap) => ({
        id: ap.id,
        customerLabel: ap.customerLabel ?? "Un client",
        requestedText: ap.requestedText,
        slot: ap.slot ? ap.slot.toISOString() : null,
        status: ap.status as "propose" | "confirme" | "annule",
        createdAt: ap.createdAt.toISOString(),
      })),
      todayCount,
      weekCount,
    };
  }

  async conversation(organizationId: string, assistantId: string, conversationId: string): Promise<ConversationDetail> {
    await this.getOwned(organizationId, assistantId);
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, assistantId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) throw new NotFoundException("Cette conversation n'existe pas.");
    return {
      id: conv.id,
      channel: conv.channel as ConversationChannel,
      customerLabel: conv.customerLabel ?? "Un client",
      messages: conv.messages.map((m) => ({
        author: m.author as "client" | "assistant" | "patron",
        text: m.text,
        at: m.createdAt.toISOString(),
      })),
    };
  }

  async saveOnboarding(organizationId: string, id: string, dto: OnboardingStep): Promise<AssistantDetail> {
    const a = await this.getOwned(organizationId, id);
    const data: Prisma.AssistantUpdateInput = { onboardingStep: dto.step };
    if (dto.establishment) {
      data.establishment = { ...readEstablishment(a.establishment), ...dto.establishment } as Prisma.InputJsonValue;
    }
    if (dto.contactPrefs) {
      data.contactPrefs = { ...readContactPrefs(a.contactPrefs), ...dto.contactPrefs } as Prisma.InputJsonValue;
    }
    if (dto.specifics) {
      data.specifics = { ...readRecord(a.specifics), ...dto.specifics } as Prisma.InputJsonValue;
    }
    await this.prisma.assistant.update({ where: { id }, data });
    return this.detail(organizationId, id);
  }

  /** « Il peut commencer » (§5.2) : l'assistant prend son poste. */
  async activate(organizationId: string, id: string): Promise<AssistantDetail> {
    const a = await this.getOwned(organizationId, id);
    const est = readEstablishment(a.establishment);
    const contact = readContactPrefs(a.contactPrefs);
    if (!est.name.trim() || (!contact.email.trim() && !contact.phone.trim())) {
      throw new UnprocessableEntityException({
        message: "Renseignez au moins le nom de l'établissement et un moyen de vous joindre.",
      });
    }

    await this.prisma.assistant.update({
      where: { id },
      data: { state: "au_travail", onboarding: "termine", startedAt: new Date(), pausedAt: null },
    });
    await this.runtime.seedInitialActivity(id);

    if (a.missionId) {
      await this.prisma.mission.update({ where: { id: a.missionId }, data: { status: "en_service" } });
    }

    const email = await this.orgOwnerEmail(organizationId);
    if (email) await this.queue.enqueueEmail(assistantReadyEmail(email, a.name));
    await this.audit.record({
      organizationId,
      action: "assistant.activated",
      target: `assistant:${id}`,
    });
    return this.detail(organizationId, id);
  }

  async addInstruction(
    organizationId: string,
    id: string,
    dto: AddInstruction,
    userId: string,
  ): Promise<AssistantDetail> {
    await this.getOwned(organizationId, id);
    const last = await this.prisma.assistantInstruction.findFirst({
      where: { assistantId: id },
      orderBy: { version: "desc" },
    });
    await this.prisma.assistantInstruction.create({
      data: {
        assistantId: id,
        version: (last?.version ?? 0) + 1,
        text: dto.text,
        createdByUserId: userId,
      },
    });
    await this.audit.record({
      organizationId,
      actorUserId: userId,
      action: "assistant.instruction_added",
      target: `assistant:${id}`,
    });
    return this.detail(organizationId, id);
  }

  async pause(organizationId: string, id: string): Promise<AssistantDetail> {
    await this.setState(organizationId, id, "en_pause");
    return this.detail(organizationId, id);
  }

  async resume(organizationId: string, id: string): Promise<AssistantDetail> {
    const a = await this.getOwned(organizationId, id);
    if (a.onboarding !== "termine") {
      throw new ConflictException("Terminez d'abord la mise en service.");
    }
    await this.setState(organizationId, id, "au_travail");
    return this.detail(organizationId, id);
  }

  // ── internes ────────────────────────────────────────────────────────────

  private async setState(organizationId: string, id: string, state: "au_travail" | "en_pause") {
    await this.getOwned(organizationId, id);
    await this.prisma.assistant.update({
      where: { id },
      data: { state, pausedAt: state === "en_pause" ? new Date() : null },
    });
    await this.audit.record({
      organizationId,
      action: state === "en_pause" ? "assistant.paused" : "assistant.resumed",
      target: `assistant:${id}`,
    });
  }

  private async getOwned(organizationId: string, id: string) {
    const a = await this.prisma.assistant.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!a) throw new NotFoundException("Cet assistant n'existe pas.");
    return a;
  }

  private async specificQuestions(professionSlug: string | null): Promise<SpecificQuestion[]> {
    if (!professionSlug) return [];
    const profession = await this.prisma.profession.findUnique({
      where: { slug: professionSlug },
      include: { template: { include: { versions: { where: { status: "published" }, take: 1 } } } },
    });
    const content = profession?.template?.versions[0]?.content as
      | { personalization?: SpecificQuestion[] }
      | undefined;
    return (content?.personalization ?? []).map((p) => ({
      key: p.key,
      label: p.label,
      type: p.type,
      options: p.options ?? [],
      required: p.required ?? false,
    }));
  }

  private async orgOwnerEmail(organizationId: string): Promise<string | null> {
    const m = await this.prisma.membership.findFirst({
      where: { organizationId, role: "owner", deletedAt: null },
      include: { user: true },
    });
    return m?.user.email ?? null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function toCard(a: {
  id: string;
  name: string;
  role: string;
  state: string;
  professionSlug: string | null;
  onboarding: string;
  onboardingStep: number;
}): AssistantCard {
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    state: a.state as AssistantCard["state"],
    professionSlug: a.professionSlug,
    onboarding: a.onboarding as AssistantCard["onboarding"],
    onboardingStep: a.onboardingStep,
  };
}

function toInstruction(i: { version: number; text: string; active: boolean; createdAt: Date }): Instruction {
  return { version: i.version, text: i.text, active: i.active, createdAt: i.createdAt.toISOString() };
}

function readEstablishment(v: unknown): EstablishmentInfo {
  const o = (v ?? {}) as Record<string, unknown>;
  return { name: str(o.name), address: str(o.address), openingHours: str(o.openingHours) };
}
function readContactPrefs(v: unknown): ContactPrefs {
  const o = (v ?? {}) as Record<string, unknown>;
  return { email: str(o.email), phone: str(o.phone), inbox: str(o.inbox) };
}
function readRecord(v: unknown): Record<string, string> {
  const o = (v ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(o)) out[k] = str(val);
  return out;
}
function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 3_600_000);
}
