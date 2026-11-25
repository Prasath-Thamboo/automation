import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { anonymizedEmail, policyFromEnv, retentionCutoffs } from "./retention-policy";

/** Nombre de lignes supprimées / anonymisées par catégorie lors d'un passage. */
export type RetentionReport = Record<string, number>;

/** Comptes supprimés traités par passage (le reste attend le lendemain). */
const ACCOUNTS_PER_RUN = 50;

/**
 * Durées de conservation et purge automatique (§9.4, Lot 18). Un passage par
 * jour (`MaintenanceWorker`). Lecture transverse, assumée comme le back-office :
 * c'est un traitement système, pas une requête d'un client.
 *
 * Ce qui n'est JAMAIS purgé : factures, avoirs, paiements (obligation comptable
 * de 10 ans — l'identité du client y est figée), devis acceptés et leur preuve
 * d'acceptation (preuve du contrat), journal d'audit (sans donnée personnelle
 * en clair).
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger("Retention");

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async run(now: Date = new Date()): Promise<RetentionReport> {
    const cut = retentionCutoffs(policyFromEnv(this.env), now);
    const report: RetentionReport = {};
    const count = (key: string, n: number) => {
      if (n > 0) report[key] = (report[key] ?? 0) + n;
    };

    // --- Données techniques ---
    if (cut.magicLink) {
      const r = await this.prisma.magicLink.deleteMany({ where: { expiresAt: { lt: cut.magicLink } } });
      count("magicLinks", r.count);
    }
    if (cut.session) {
      const r = await this.prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lt: cut.session } }, { revokedAt: { lt: cut.session } }] },
      });
      count("sessions", r.count);
    }
    if (cut.webhook) {
      const r = await this.prisma.webhookEvent.deleteMany({ where: { receivedAt: { lt: cut.webhook } } });
      count("webhookEvents", r.count);
    }
    if (cut.pushToken) {
      const r = await this.prisma.pushToken.deleteMany({ where: { disabledAt: { lt: cut.pushToken } } });
      count("pushTokens", r.count);
    }

    // --- Prospects (questionnaire anonyme, jamais devenu client) ---
    // Le devis et sa fiche de poste suivent (suppression en cascade).
    if (cut.assessment) {
      const r = await this.prisma.needsAssessment.deleteMany({
        where: { organizationId: null, quote: { is: null }, updatedAt: { lt: cut.assessment } },
      });
      count("abandonedAssessments", r.count);
    }
    if (cut.prospect) {
      const r = await this.prisma.needsAssessment.deleteMany({
        where: {
          organizationId: null,
          updatedAt: { lt: cut.prospect },
          OR: [{ quote: { is: null } }, { quote: { is: { status: { not: "accepte" } } } }],
        },
      });
      count("prospects", r.count);
    }

    // --- Activité ancienne des comptes actifs ---
    if (cut.activity) {
      const before = cut.activity;
      const conv = await this.prisma.conversation.deleteMany({ where: { lastMessageAt: { lt: before } } });
      count("conversations", conv.count);
      const esc = await this.prisma.escalation.deleteMany({
        where: { status: "repondue", createdAt: { lt: before } },
      });
      count("escalations", esc.count);
      const appt = await this.prisma.appointment.deleteMany({
        where: { createdAt: { lt: before }, OR: [{ slot: null }, { slot: { lt: before } }] },
      });
      count("appointments", appt.count);
      const help = await this.prisma.helpRequest.deleteMany({ where: { createdAt: { lt: before } } });
      count("helpRequests", help.count);
    }

    // --- Comptes supprimés, au-delà du délai de grâce ---
    if (cut.deletedAccount) {
      const orgs = await this.prisma.organization.findMany({
        where: { deletedAt: { lt: cut.deletedAccount }, purgedAt: null },
        select: { id: true },
        orderBy: { deletedAt: "asc" },
        take: ACCOUNTS_PER_RUN,
      });
      for (const org of orgs) {
        const users = await this.purgeOrganization(org.id, now);
        count("deletedAccounts", 1);
        count("anonymizedUsers", users);
      }
    }

    if (Object.keys(report).length > 0) {
      this.logger.log(`Purge : ${JSON.stringify(report)}`);
      await this.audit.record({ action: "retention.purged", metadata: report });
    }
    return report;
  }

  /**
   * Efface les données personnelles d'une organisation supprimée. Garde la
   * ligne (les factures y sont rattachées) sous un nom neutre. Renvoie le
   * nombre d'utilisateurs anonymisés.
   */
  private async purgeOrganization(orgId: string, now: Date): Promise<number> {
    // Utilisateurs sans plus aucune appartenance active ailleurs.
    const users = await this.prisma.user.findMany({
      where: {
        memberships: { some: { organizationId: orgId }, none: { deletedAt: null } },
        deletedAt: null,
      },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    await this.prisma.$transaction([
      // L'employé emporte consignes, conversations, messages, escalades,
      // rendez-vous, canaux et boutons (cascade).
      this.prisma.assistant.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.mission.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.helpRequest.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.pushToken.deleteMany({ where: { organizationId: orgId } }),
      // Lot 22 — références de carte (déjà retirées chez le fournisseur à la suppression).
      this.prisma.savedCard.deleteMany({ where: { organizationId: orgId } }),
      this.prisma.needsAssessment.updateMany({
        where: { organizationId: orgId },
        data: { email: anonymizedEmail(orgId), answers: {} },
      }),
      this.prisma.session.deleteMany({ where: { userId: { in: userIds } } }),
      this.prisma.magicLink.deleteMany({ where: { userId: { in: userIds } } }),
      this.prisma.pushToken.deleteMany({ where: { userId: { in: userIds } } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } }),
      ...userIds.map((id) =>
        this.prisma.user.update({
          where: { id },
          data: { email: anonymizedEmail(id), fullName: null, deletedAt: now },
        }),
      ),
      this.prisma.organization.update({
        where: { id: orgId },
        data: { name: "Compte supprimé", slug: `supprime-${orgId}`, purgedAt: now },
      }),
    ]);
    return userIds.length;
  }
}
