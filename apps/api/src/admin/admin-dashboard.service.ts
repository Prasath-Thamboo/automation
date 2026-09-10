import { Injectable } from "@nestjs/common";
import type { AdminDashboard } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";

const DECIDED_STATUSES = ["envoye", "vu", "accepte", "refuse", "expire"] as const;

/** Taux d'acceptation : devis acceptés / devis effectivement soumis au client. */
export function acceptanceRatePct(byStatus: Record<string, number>): number {
  const decided = DECIDED_STATUSES.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
  if (decided === 0) return 0;
  return Math.round(((byStatus.accepte ?? 0) / decided) * 100);
}

/** Transforme un résultat `groupBy` en `{ clé: nombre }`. */
export function tally(rows: { _count: number }[], keyOf: (row: Record<string, unknown>) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[keyOf(r as Record<string, unknown>)] = r._count;
  return out;
}

/**
 * Tableau de bord d'activité du back-office (§10, Lot 10). Agrégats en lecture
 * seule, sans donnée personnelle.
 */
@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AdminDashboard> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      quotesByStatus,
      quotesCreated30d,
      quotesAccepted30d,
      activeSubs,
      unpaid,
      missionsByStatus,
      assistantsByState,
      orgTotal,
      orgNew30d,
      orgsWithActiveSub,
      openEscalations,
    ] = await Promise.all([
      this.prisma.quote.groupBy({ by: ["status"], _count: true, where: { deletedAt: null } }),
      this.prisma.quote.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
      this.prisma.quote.count({
        where: { deletedAt: null, status: "accepte", decidedAt: { gte: since } },
      }),
      this.prisma.subscription.findMany({
        where: { status: "active" },
        select: { monthlyCents: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: "impayee" },
        _count: true,
        _sum: { totalCents: true },
      }),
      this.prisma.mission.groupBy({ by: ["status"], _count: true }),
      this.prisma.assistant.groupBy({ by: ["state"], _count: true, where: { deletedAt: null } }),
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.organization.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
      this.prisma.subscription.findMany({
        where: { status: "active" },
        select: { organizationId: true },
        distinct: ["organizationId"],
      }),
      this.prisma.escalation.count({ where: { status: "ouverte" } }),
    ]);

    const byStatus = tally(quotesByStatus, (r) => String(r.status));
    const mrrCents = activeSubs.reduce((sum, s) => sum + s.monthlyCents, 0);

    return {
      quotes: {
        byStatus,
        acceptanceRatePct: acceptanceRatePct(byStatus),
        createdLast30d: quotesCreated30d,
        acceptedLast30d: quotesAccepted30d,
      },
      revenue: {
        mrrEur: Math.round(mrrCents) / 100,
        activeSubscriptions: activeSubs.length,
        unpaidInvoices: unpaid._count,
        unpaidEur: (unpaid._sum.totalCents ?? 0) / 100,
      },
      missions: {
        byStatus: tally(missionsByStatus, (r) => String(r.status)),
      },
      assistants: {
        byState: tally(assistantsByState, (r) => String(r.state)),
      },
      clients: {
        total: orgTotal,
        withActiveSubscription: orgsWithActiveSub.length,
        newLast30d: orgNew30d,
      },
      openEscalations,
    };
  }
}
