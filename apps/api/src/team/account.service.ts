import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AccountInfo, SessionUser, UpdateAccount } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BillingService } from "../billing/billing.service";

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  async info(user: SessionUser): Promise<AccountInfo> {
    const [memberships, docs] = await Promise.all([
      this.prisma.membership.findMany({
        where: { organizationId: user.organizationId, deletedAt: null },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      this.billing.documentsFor(user.organizationId),
    ]);
    return {
      email: user.email,
      fullName: user.fullName,
      organizationName: user.organizationName,
      role: user.role,
      members: memberships.map((m) => ({
        email: m.user.email,
        fullName: m.user.fullName,
        role: m.role,
      })),
      subscription: docs.subscription,
    };
  }

  async updateProfile(user: SessionUser, dto: UpdateAccount): Promise<AccountInfo> {
    await this.prisma.user.update({ where: { id: user.id }, data: { fullName: dto.fullName } });
    return this.info({ ...user, fullName: dto.fullName });
  }

  async cancelSubscription(user: SessionUser): Promise<AccountInfo> {
    this.requireOwner(user);
    await this.billing.cancelSubscription(user.organizationId);
    await this.prisma.assistant.updateMany({
      where: { organizationId: user.organizationId, state: "au_travail" },
      data: { state: "en_pause", pausedAt: new Date() },
    });
    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "account.subscription_canceled",
    });
    return this.info(user);
  }

  /** Export complet des données de l'organisation (§9.4 — droit RGPD, dans le produit). */
  async exportData(user: SessionUser): Promise<Record<string, unknown>> {
    const orgId = user.organizationId;
    const [org, memberships, assistants, instructions, conversations, messages, escalations, quotes, invoices, creditNotes, payments, subscription] =
      await Promise.all([
        this.prisma.organization.findUnique({ where: { id: orgId } }),
        this.prisma.membership.findMany({ where: { organizationId: orgId }, include: { user: true } }),
        this.prisma.assistant.findMany({ where: { organizationId: orgId } }),
        this.prisma.assistantInstruction.findMany({
          where: { assistant: { organizationId: orgId } },
        }),
        this.prisma.conversation.findMany({ where: { organizationId: orgId } }),
        this.prisma.message.findMany({ where: { conversation: { organizationId: orgId } } }),
        this.prisma.escalation.findMany({ where: { organizationId: orgId } }),
        this.prisma.quote.findMany({ where: { organizationId: orgId } }),
        this.prisma.invoice.findMany({ where: { organizationId: orgId }, include: { lineItems: true } }),
        this.prisma.creditNote.findMany({ where: { organizationId: orgId } }),
        this.prisma.payment.findMany({ where: { organizationId: orgId } }),
        this.prisma.subscription.findMany({ where: { organizationId: orgId } }),
      ]);

    await this.audit.record({
      organizationId: orgId,
      actorUserId: user.id,
      action: "account.data_exported",
    });

    return {
      exportedAt: new Date().toISOString(),
      organization: org,
      members: memberships.map((m) => ({ role: m.role, user: m.user })),
      assistants,
      instructions,
      conversations,
      messages,
      escalations,
      quotes,
      invoices,
      creditNotes,
      payments,
      subscription,
    };
  }

  /** Suppression du compte (§9.4). Soft delete immédiat ; purge par la rétention. */
  async deleteAccount(user: SessionUser): Promise<{ ok: true }> {
    this.requireOwner(user);
    const orgId = user.organizationId;
    const now = new Date();

    await this.billing.cancelSubscription(orgId);
    await this.prisma.$transaction([
      this.prisma.assistant.updateMany({ where: { organizationId: orgId }, data: { deletedAt: now } }),
      this.prisma.membership.updateMany({ where: { organizationId: orgId }, data: { deletedAt: now } }),
      this.prisma.session.updateMany({
        where: { user: { memberships: { some: { organizationId: orgId } } }, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.organization.update({ where: { id: orgId }, data: { deletedAt: now } }),
    ]);

    await this.audit.record({
      organizationId: orgId,
      actorUserId: user.id,
      action: "account.deleted",
    });
    return { ok: true };
  }

  private requireOwner(user: SessionUser): void {
    if (user.role !== "owner" && user.role !== "admin") {
      throw new ForbiddenException("Seul le titulaire du compte peut effectuer cette action.");
    }
  }
}
