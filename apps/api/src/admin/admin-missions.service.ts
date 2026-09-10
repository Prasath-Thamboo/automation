import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminMissionDetail,
  AdminMissionList,
  AdminMissionListItem,
  MissionChecklistItem,
  UpdateMission,
} from "@tando/types";
import { Prisma, type Mission, type MissionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

type MissionRow = Mission & {
  quote: { number: string } | null;
};

function toChecklist(value: unknown): MissionChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { label: unknown; done: unknown } => typeof v === "object" && v !== null)
    .map((v) => ({ label: String((v as { label: unknown }).label ?? ""), done: Boolean((v as { done: unknown }).done) }))
    .filter((v) => v.label.length > 0);
}

/** Pilotage des missions de mise en service (§4.3, §10). */
@Injectable()
export class AdminMissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: MissionStatus): Promise<AdminMissionList> {
    const rows = await this.prisma.mission.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { quote: { select: { number: true } } },
    });

    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const [orgs, assistants] = await Promise.all([
      this.prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      }),
      this.prisma.assistant.findMany({
        where: { missionId: { in: rows.map((r) => r.id) } },
        select: { id: true, name: true, missionId: true },
      }),
    ]);
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const assistantOf = new Map(assistants.map((a) => [a.missionId, a]));

    return {
      missions: rows.map((r) => this.toListItem(r, orgName.get(r.organizationId), assistantOf.get(r.id))),
    };
  }

  async get(id: string): Promise<AdminMissionDetail> {
    const row = await this.prisma.mission.findUnique({
      where: { id },
      include: { quote: { select: { number: true } } },
    });
    if (!row) throw new NotFoundException("Cette mission n'existe pas.");

    const [org, assistant] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: row.organizationId },
        select: { name: true },
      }),
      this.prisma.assistant.findFirst({
        where: { missionId: row.id },
        select: { id: true, name: true },
      }),
    ]);

    return {
      ...this.toListItem(row, org?.name, assistant ?? undefined),
      organizationId: row.organizationId,
      quoteId: row.quoteId,
      jobDescription: row.jobDescription,
      answers: (row.answers ?? {}) as Record<string, unknown>,
      checklist: toChecklist(row.checklist),
    };
  }

  async update(id: string, dto: UpdateMission, actorUserId: string): Promise<AdminMissionDetail> {
    const existing = await this.prisma.mission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Cette mission n'existe pas.");

    const data: Prisma.MissionUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.checklist) data.checklist = dto.checklist as unknown as Prisma.InputJsonValue;

    await this.prisma.mission.update({ where: { id }, data });
    await this.audit.record({
      organizationId: existing.organizationId,
      actorUserId,
      action: "admin.mission_updated",
      target: `mission:${id}`,
      metadata: { status: dto.status ?? existing.status },
    });
    return this.get(id);
  }

  private toListItem(
    row: MissionRow,
    organizationName: string | undefined,
    assistant: { id: string; name: string } | undefined,
  ): AdminMissionListItem {
    return {
      id: row.id,
      quoteNumber: row.quote?.number ?? "—",
      organizationName: organizationName ?? "—",
      status: row.status,
      assistantId: assistant?.id ?? null,
      assistantName: assistant?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
