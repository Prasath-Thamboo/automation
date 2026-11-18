import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ENV } from "../config/config.module";
import { n8nToken, type Env } from "../config/env";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { safeEqual } from "../channels/webhook-auth";
import { PrismaService } from "../prisma/prisma.service";
import { RuntimeService } from "./runtime.service";

const activitySchema = z.object({
  /** Ce que lit le patron dans le carnet de bord (« Il a relancé 3 devis »). */
  summary: z.string().trim().min(1).max(300),
});
type Activity = z.infer<typeof activitySchema>;

const escalationSchema = z.object({
  question: z.string().trim().min(1).max(1600),
  context: z.string().trim().max(1600).default(""),
  summary: z.string().trim().min(1).max(300).default("Il vous a transmis une question."),
});
type WorkflowEscalation = z.infer<typeof escalationSchema>;

export interface WorkflowState {
  assistantId: string;
  name: string;
  /** Faux si le patron l'a mis en pause ou s'il n'a pas encore pris son poste. */
  working: boolean;
  state: string;
  switches: Record<string, boolean>;
  establishment: Record<string, unknown>;
}

/**
 * Lot 14 — accès des flux n8n à l'API, pour les flux qui tournent seuls
 * (planifiés) : ils lisent l'état du client avant d'agir (pause, boutons), puis
 * rendent compte. Authentifié par `X-Velekya-Token` (= `N8N_TOKEN`), sans session.
 */
@ApiTags("n8n")
@Controller("n8n/assistants")
export class N8nController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly runtime: RuntimeService,
  ) {}

  @Get(":id/state")
  async state(
    @Headers("x-velekya-token") token: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WorkflowState> {
    const a = await this.assistant(token, id);
    const switches = await this.prisma.assistantSwitch.findMany({ where: { assistantId: a.id } });
    return {
      assistantId: a.id,
      name: a.name,
      working: a.state === "au_travail",
      state: a.state,
      switches: Object.fromEntries(switches.map((s) => [s.key, s.enabled])),
      establishment: (a.establishment as Record<string, unknown>) ?? {},
    };
  }

  @Post(":id/activity")
  async activity(
    @Headers("x-velekya-token") token: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(activitySchema)) body: Activity,
  ): Promise<{ conversationId: string }> {
    const a = await this.assistant(token, id);
    const conversationId = await this.runtime.reportFromWorkflow(a, {
      kind: "reply",
      text: "",
      capability: "travail_planifie",
      summary: body.summary,
    });
    return { conversationId };
  }

  @Post(":id/escalations")
  async escalate(
    @Headers("x-velekya-token") token: string | undefined,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(escalationSchema)) body: WorkflowEscalation,
  ): Promise<{ conversationId: string }> {
    const a = await this.assistant(token, id);
    const conversationId = await this.runtime.reportFromWorkflow(a, {
      kind: "escalate",
      question: body.question,
      context: body.context,
      ackText: "",
      summary: body.summary,
    });
    return { conversationId };
  }

  private async assistant(token: string | undefined, id: string) {
    if (!safeEqual(token, n8nToken(this.env))) throw new ForbiddenException("Accès refusé.");
    const a = await this.prisma.assistant.findFirst({ where: { id, deletedAt: null } });
    if (!a) throw new NotFoundException("Assistant introuvable.");
    return a;
  }
}

/**
 * Lot 16 — flux génériques d'un métier (offre prêt à l'emploi). Un flux
 * planifié partagé liste les employés qu'il sert, puis agit pour chacun avec
 * ses propres données et rend compte via `/n8n/assistants/:id/*`.
 */
@ApiTags("n8n")
@Controller("n8n/professions")
export class N8nProfessionsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  @Get(":slug/assistants")
  async assistants(
    @Headers("x-velekya-token") token: string | undefined,
    @Param("slug") slug: string,
  ): Promise<{ assistants: WorkflowState[] }> {
    if (!safeEqual(token, n8nToken(this.env))) throw new ForbiddenException("Accès refusé.");
    // Seuls ceux qui passent par le flux du métier (pas de flux propre).
    const rows = await this.prisma.assistant.findMany({
      where: { professionSlug: slug, workflowUrl: null, deletedAt: null },
      include: { switches: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      assistants: rows.map((a) => ({
        assistantId: a.id,
        name: a.name,
        working: a.state === "au_travail",
        state: a.state,
        switches: Object.fromEntries(a.switches.map((s) => [s.key, s.enabled])),
        establishment: (a.establishment as Record<string, unknown>) ?? {},
      })),
    };
  }
}
