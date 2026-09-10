import { describe, expect, it, vi } from "vitest";
import { AdminDashboardService, acceptanceRatePct, tally } from "./admin-dashboard.service";

describe("acceptanceRatePct", () => {
  it("rapporte les acceptés aux devis soumis au client", () => {
    expect(acceptanceRatePct({ brouillon: 3, envoye: 2, vu: 1, accepte: 3, refuse: 1, expire: 1 })).toBe(
      Math.round((3 / 8) * 100),
    );
  });
  it("0 quand aucun devis n'a été soumis", () => {
    expect(acceptanceRatePct({ brouillon: 5 })).toBe(0);
    expect(acceptanceRatePct({})).toBe(0);
  });
});

describe("tally", () => {
  it("transforme un groupBy en dictionnaire clé → nombre", () => {
    const rows = [
      { status: "a_preparer", _count: 2 },
      { status: "en_service", _count: 5 },
    ];
    expect(tally(rows, (r) => String(r.status))).toEqual({ a_preparer: 2, en_service: 5 });
  });
});

describe("AdminDashboardService.summary", () => {
  it("agrège devis, MRR, missions, clients et escalades", async () => {
    const prisma = {
      quote: {
        groupBy: vi.fn().mockResolvedValue([
          { status: "envoye", _count: 4 },
          { status: "accepte", _count: 6 },
        ]),
        count: vi.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(6),
      },
      subscription: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ monthlyCents: 8900 }, { monthlyCents: 12000 }])
          .mockResolvedValueOnce([{ organizationId: "o1" }, { organizationId: "o2" }]),
      },
      invoice: {
        aggregate: vi.fn().mockResolvedValue({ _count: 2, _sum: { totalCents: 21800 } }),
      },
      mission: { groupBy: vi.fn().mockResolvedValue([{ status: "en_service", _count: 3 }]) },
      assistant: { groupBy: vi.fn().mockResolvedValue([{ state: "au_travail", _count: 3 }]) },
      organization: { count: vi.fn().mockResolvedValueOnce(9).mockResolvedValueOnce(2) },
      escalation: { count: vi.fn().mockResolvedValue(1) },
    };

    const service = new AdminDashboardService(prisma as never);
    const out = await service.summary();

    expect(out.quotes.byStatus).toEqual({ envoye: 4, accepte: 6 });
    expect(out.quotes.acceptanceRatePct).toBe(60);
    expect(out.quotes.createdLast30d).toBe(7);
    expect(out.revenue.mrrEur).toBe(209);
    expect(out.revenue.activeSubscriptions).toBe(2);
    expect(out.revenue.unpaidInvoices).toBe(2);
    expect(out.revenue.unpaidEur).toBe(218);
    expect(out.missions.byStatus).toEqual({ en_service: 3 });
    expect(out.assistants.byState).toEqual({ au_travail: 3 });
    expect(out.clients).toEqual({ total: 9, withActiveSubscription: 2, newLast30d: 2 });
    expect(out.openEscalations).toBe(1);
  });
});
