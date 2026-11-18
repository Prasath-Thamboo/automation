import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, type AssistantSwitch } from "@prisma/client";
import {
  defaultSwitchSchema,
  type AdminProfessionWorkflow,
  type UpdateProfessionWorkflow,
} from "@velekya/types";
import type {
  AdminAssistantSetup,
  AdminSwitch,
  CreateSwitch,
  UpdateSwitch,
  UpdateWorkflow,
} from "@velekya/types";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/**
 * Back-office (Lot 14) : l'équipe Velekya branche le flux n8n construit pour un
 * client et déclare les boutons qu'il pourra actionner. Lecture/écriture
 * transverse, gardée par `AdminGuard`.
 */
@Injectable()
export class AdminSetupService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Lot 16 — flux générique d'un métier (offre prêt à l'emploi) ─────────

  async getProfessionWorkflow(professionId: string): Promise<AdminProfessionWorkflow> {
    const p = await this.prisma.profession.findFirst({ where: { id: professionId, deletedAt: null } });
    if (!p) throw new NotFoundException("Métier introuvable.");
    const assistantsOnFlow = await this.prisma.assistant.count({
      where: { professionSlug: p.slug, workflowUrl: null, deletedAt: null },
    });
    const switches = defaultSwitchSchema.array().safeParse(p.defaultSwitches);
    return {
      professionId: p.id,
      slug: p.slug,
      workflowUrl: p.workflowUrl,
      defaultSwitches: switches.success ? switches.data : [],
      assistantsOnFlow,
    };
  }

  /** Les boutons par défaut ne s'appliquent qu'aux employés embauchés ensuite. */
  async setProfessionWorkflow(
    professionId: string,
    dto: UpdateProfessionWorkflow,
    actorUserId: string,
  ): Promise<AdminProfessionWorkflow> {
    const p = await this.prisma.profession.findFirst({ where: { id: professionId, deletedAt: null } });
    if (!p) throw new NotFoundException("Métier introuvable.");
    if (dto.workflowUrl) assertAllowedUrl(dto.workflowUrl, this.env);
    await this.prisma.profession.update({
      where: { id: p.id },
      data: {
        workflowUrl: dto.workflowUrl,
        defaultSwitches: dto.defaultSwitches as Prisma.InputJsonValue,
      },
    });
    await this.audit.record({
      actorUserId,
      action: "admin.profession_workflow_updated",
      target: `profession:${p.id}`,
      metadata: { slug: p.slug, connected: Boolean(dto.workflowUrl), switches: dto.defaultSwitches.length },
    });
    return this.getProfessionWorkflow(p.id);
  }

  async get(assistantId: string): Promise<AdminAssistantSetup> {
    const a = await this.prisma.assistant.findFirst({
      where: { id: assistantId, deletedAt: null },
      include: { switches: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
    });
    if (!a) throw new NotFoundException("Assistant introuvable.");
    return {
      assistant: { id: a.id, name: a.name, organizationId: a.organizationId, state: a.state },
      workflowUrl: a.workflowUrl,
      switches: a.switches.map(toDto),
    };
  }

  async setWorkflow(assistantId: string, dto: UpdateWorkflow, actorUserId: string): Promise<AdminAssistantSetup> {
    const a = await this.owned(assistantId);
    if (dto.workflowUrl) assertAllowedUrl(dto.workflowUrl, this.env);
    await this.prisma.assistant.update({ where: { id: a.id }, data: { workflowUrl: dto.workflowUrl } });
    await this.audit.record({
      organizationId: a.organizationId,
      actorUserId,
      action: dto.workflowUrl ? "assistant.workflow_set" : "assistant.workflow_cleared",
      target: `assistant:${a.id}`,
    });
    return this.get(a.id);
  }

  async createSwitch(assistantId: string, dto: CreateSwitch, actorUserId: string): Promise<AdminAssistantSetup> {
    const a = await this.owned(assistantId);
    try {
      await this.prisma.assistantSwitch.create({
        data: {
          assistantId: a.id,
          organizationId: a.organizationId,
          key: dto.key,
          label: dto.label,
          help: dto.help,
          enabled: dto.enabled,
          position: dto.position,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(`La clé « ${dto.key} » existe déjà pour cet employé.`);
      }
      throw e;
    }
    await this.audit.record({
      organizationId: a.organizationId,
      actorUserId,
      action: "assistant.switch_created",
      target: `assistant:${a.id}`,
      metadata: { key: dto.key },
    });
    return this.get(a.id);
  }

  async updateSwitch(switchId: string, dto: UpdateSwitch, actorUserId: string): Promise<AdminAssistantSetup> {
    const sw = await this.prisma.assistantSwitch.findUnique({ where: { id: switchId } });
    if (!sw) throw new NotFoundException("Bouton introuvable.");
    await this.prisma.assistantSwitch.update({ where: { id: sw.id }, data: dto });
    await this.audit.record({
      organizationId: sw.organizationId,
      actorUserId,
      action: "assistant.switch_updated",
      target: `assistant:${sw.assistantId}`,
      metadata: { key: sw.key },
    });
    return this.get(sw.assistantId);
  }

  async removeSwitch(switchId: string, actorUserId: string): Promise<AdminAssistantSetup> {
    const sw = await this.prisma.assistantSwitch.findUnique({ where: { id: switchId } });
    if (!sw) throw new NotFoundException("Bouton introuvable.");
    await this.prisma.assistantSwitch.delete({ where: { id: sw.id } });
    await this.audit.record({
      organizationId: sw.organizationId,
      actorUserId,
      action: "assistant.switch_removed",
      target: `assistant:${sw.assistantId}`,
      metadata: { key: sw.key },
    });
    return this.get(sw.assistantId);
  }

  private async owned(assistantId: string) {
    const a = await this.prisma.assistant.findFirst({ where: { id: assistantId, deletedAt: null } });
    if (!a) throw new NotFoundException("Assistant introuvable.");
    return a;
  }
}

/**
 * L'API appelle cette adresse à chaque message : on la restreint à l'instance
 * n8n de Velekya (`N8N_BASE_URL`) quand elle est configurée, et toujours en https
 * en production.
 */
export function assertAllowedUrl(url: string, env: Pick<Env, "N8N_BASE_URL" | "NODE_ENV">): void {
  const u = new URL(url);
  if (env.NODE_ENV === "production" && u.protocol !== "https:") {
    throw new UnprocessableEntityException({ message: "L'adresse du flux doit être en https." });
  }
  if (env.N8N_BASE_URL && u.origin !== new URL(env.N8N_BASE_URL).origin) {
    throw new UnprocessableEntityException({
      message: `L'adresse du flux doit être sur ${new URL(env.N8N_BASE_URL).origin}.`,
    });
  }
}

function toDto(s: AssistantSwitch): AdminSwitch {
  return { id: s.id, key: s.key, label: s.label, help: s.help, enabled: s.enabled, position: s.position };
}
