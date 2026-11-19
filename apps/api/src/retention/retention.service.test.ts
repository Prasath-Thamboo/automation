import { describe, expect, it, vi } from "vitest";
import { RetentionService } from "./retention.service";
import { anonymizedEmail, retentionCutoffs, type RetentionPolicy } from "./retention-policy";

const NOW = new Date("2026-11-19T03:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

const env = {
  RETENTION_MAGIC_LINK_DAYS: 7,
  RETENTION_SESSION_DAYS: 30,
  RETENTION_ASSESSMENT_DAYS: 90,
  RETENTION_PROSPECT_DAYS: 1095,
  RETENTION_WEBHOOK_DAYS: 90,
  RETENTION_PUSH_TOKEN_DAYS: 30,
  RETENTION_DELETED_ACCOUNT_DAYS: 30,
  RETENTION_ACTIVITY_DAYS: 730,
};

const many = (count = 0) => ({ deleteMany: vi.fn().mockResolvedValue({ count }) });

function setup(opts: { deletedOrgs?: string[]; users?: string[]; activity?: number } = {}) {
  const prisma = {
    magicLink: many(3),
    session: many(2),
    webhookEvent: many(0),
    pushToken: many(1),
    needsAssessment: { ...many(0), updateMany: vi.fn().mockReturnValue("assessment.updateMany") },
    conversation: many(4),
    escalation: many(0),
    appointment: many(0),
    helpRequest: many(0),
    assistant: many(0),
    mission: many(0),
    notificationPreference: many(0),
    organization: {
      findMany: vi.fn().mockResolvedValue((opts.deletedOrgs ?? []).map((id) => ({ id }))),
      update: vi.fn().mockReturnValue("organization.update"),
    },
    user: {
      findMany: vi.fn().mockResolvedValue((opts.users ?? []).map((id) => ({ id }))),
      update: vi.fn().mockReturnValue("user.update"),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const audit = { record: vi.fn() };
  const svc = new RetentionService(
    prisma as never,
    audit as never,
    { ...env, RETENTION_ACTIVITY_DAYS: opts.activity ?? 730 } as never,
  );
  return { svc, prisma, audit };
}

describe("retentionCutoffs", () => {
  it("calcule une date limite par catégorie, null si 0 (conservé)", () => {
    const policy: RetentionPolicy = {
      magicLink: 7,
      session: 30,
      assessment: 90,
      prospect: 1095,
      webhook: 90,
      pushToken: 30,
      deletedAccount: 30,
      activity: 0,
    };
    const cut = retentionCutoffs(policy, NOW);
    expect(cut.magicLink).toEqual(daysAgo(7));
    expect(cut.prospect).toEqual(daysAgo(1095));
    expect(cut.activity).toBeNull();
  });
});

describe("RetentionService.run", () => {
  it("purge les données techniques échues et rend compte", async () => {
    const { svc, prisma, audit } = setup();
    const report = await svc.run(NOW);

    expect(prisma.magicLink.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: daysAgo(7) } } });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ expiresAt: { lt: daysAgo(30) } }, { revokedAt: { lt: daysAgo(30) } }] },
    });
    expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { disabledAt: { lt: daysAgo(30) } } });
    expect(report).toEqual({ magicLinks: 3, sessions: 2, pushTokens: 1, conversations: 4 });
    expect(audit.record).toHaveBeenCalledWith({ action: "retention.purged", metadata: report });
  });

  it("ne supprime jamais un prospect devenu client ni un devis accepté", async () => {
    const { svc, prisma } = setup();
    await svc.run(NOW);
    const [abandoned, prospects] = prisma.needsAssessment.deleteMany.mock.calls.map((c) => c[0].where);
    expect(abandoned).toEqual({ organizationId: null, quote: { is: null }, updatedAt: { lt: daysAgo(90) } });
    expect(prospects).toMatchObject({ organizationId: null, updatedAt: { lt: daysAgo(1095) } });
    expect(prospects.OR).toContainEqual({ quote: { is: { status: { not: "accepte" } } } });
  });

  it("garde l'activité des comptes actifs quand RETENTION_ACTIVITY_DAYS=0", async () => {
    const { svc, prisma } = setup({ activity: 0 });
    await svc.run(NOW);
    expect(prisma.conversation.deleteMany).not.toHaveBeenCalled();
    expect(prisma.helpRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("n'écrit rien dans l'audit quand il n'y a rien à purger", async () => {
    const { svc, prisma, audit } = setup({ activity: 0 });
    for (const m of [prisma.magicLink, prisma.session, prisma.pushToken]) {
      m.deleteMany.mockResolvedValue({ count: 0 });
    }
    await expect(svc.run(NOW)).resolves.toEqual({});
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("efface un compte supprimé après le délai de grâce, sans toucher aux factures", async () => {
    const { svc, prisma } = setup({ deletedOrgs: ["org-1"], users: ["u-1"] });
    const report = await svc.run(NOW);

    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: { lt: daysAgo(30) }, purgedAt: null } }),
    );
    // Seuls les utilisateurs sans autre entreprise active sont anonymisés.
    expect(prisma.user.findMany.mock.calls[0]?.[0].where.memberships).toEqual({
      some: { organizationId: "org-1" },
      none: { deletedAt: null },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { email: anonymizedEmail("u-1"), fullName: null, deletedAt: NOW },
    });
    expect(prisma.assistant.deleteMany).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { name: "Compte supprimé", slug: "supprime-org-1", purgedAt: NOW },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({ deletedAccounts: 1, anonymizedUsers: 1 });
    // Le mock n'expose aucune table comptable : y toucher ferait échouer le test.
    expect(Object.keys(prisma)).not.toContain("invoice");
  });
});
