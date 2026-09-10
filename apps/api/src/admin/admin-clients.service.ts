import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AdminClientDetail,
  AdminClientList,
  AdminClientListItem,
  SubscriptionSummary,
} from "@tando/types";
import type { Subscription } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

function toSubSummary(sub: Subscription): SubscriptionSummary {
  return {
    status: sub.status,
    formula: sub.formula,
    currency: sub.currency,
    monthlyEur: sub.monthlyCents / 100,
    setupEur: sub.setupCents / 100,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
  };
}

/** Fiche client du back-office : organisations, contrat, équipe, activité (§10). */
@Injectable()
export class AdminClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminClientList> {
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { memberships: { where: { deletedAt: null } } } } },
    });
    const ids = orgs.map((o) => o.id);

    const [subs, assistantCounts, escalationCounts] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { organizationId: { in: ids } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.assistant.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: ids }, deletedAt: null },
        _count: true,
      }),
      this.prisma.escalation.groupBy({
        by: ["organizationId"],
        where: { organizationId: { in: ids }, status: "ouverte" },
        _count: true,
      }),
    ]);

    const subOf = new Map<string, Subscription>();
    for (const s of subs) if (!subOf.has(s.organizationId)) subOf.set(s.organizationId, s);
    const assistantsOf = new Map(assistantCounts.map((r) => [r.organizationId, r._count]));
    const escalationsOf = new Map(escalationCounts.map((r) => [r.organizationId, r._count]));

    const clients: AdminClientListItem[] = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      createdAt: o.createdAt.toISOString(),
      memberCount: o._count.memberships,
      assistantCount: assistantsOf.get(o.id) ?? 0,
      subscriptionStatus: subOf.get(o.id)?.status ?? null,
      openEscalations: escalationsOf.get(o.id) ?? 0,
    }));
    return { clients };
  }

  async get(id: string): Promise<AdminClientDetail> {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: { user: { select: { email: true, fullName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!org) throw new NotFoundException("Ce client n'existe pas.");

    const [subscription, assistants, invoices, escalations, openEscalations] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { organizationId: id },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.assistant.findMany({
        where: { organizationId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, role: true, state: true, onboarding: true },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId: id },
        orderBy: { issuedAt: "desc" },
        take: 5,
        select: { number: true, status: true, totalCents: true, issuedAt: true },
      }),
      this.prisma.escalation.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, question: true, status: true, createdAt: true },
      }),
      this.prisma.escalation.count({ where: { organizationId: id, status: "ouverte" } }),
    ]);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
      memberCount: org.memberships.length,
      assistantCount: assistants.length,
      subscriptionStatus: subscription?.status ?? null,
      openEscalations,
      members: org.memberships.map((m) => ({
        email: m.user.email,
        fullName: m.user.fullName,
        role: m.role,
      })),
      assistants,
      subscription: subscription ? toSubSummary(subscription) : null,
      recentInvoices: invoices.map((i) => ({
        number: i.number,
        status: i.status,
        totalEur: i.totalCents / 100,
        issuedAt: i.issuedAt.toISOString(),
      })),
      recentEscalations: escalations.map((e) => ({
        id: e.id,
        question: e.question,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}
