import { describe, expect, it, vi } from "vitest";
import { CatalogSubscribeService } from "./catalog-subscribe.service";

const content = {
  assistantName: "Camille",
  assistantRole: "votre assistante de salon",
  intro: "Je prends vos rendez-vous.",
  canDo: ["Prendre les rendez-vous"],
  cannotDo: ["Donner un prix"],
};

function setup(opts: { existingAssistant?: boolean; openSubscription?: boolean; defaultSwitches?: unknown } = {}) {
  const prisma = {
    assistant: {
      findFirst: vi.fn().mockResolvedValue(opts.existingAssistant ? { id: "a-old" } : null),
      create: vi.fn().mockResolvedValue({ id: "a-new" }),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(opts.openSubscription ? { id: "s-old" } : null),
    },
    profession: {
      findFirst: vi.fn().mockResolvedValue({
        slug: "salon",
        name: "Salon",
        monthlyPriceEur: 89,
        defaultSwitches: opts.defaultSwitches ?? [],
        template: { versions: [{ content }] },
      }),
    },
  };
  const billing = { startCatalogSubscription: vi.fn().mockResolvedValue({ id: "s-new" }) };
  const audit = { record: vi.fn() };
  const svc = new CatalogSubscribeService(
    prisma as never,
    billing as never,
    audit as never,
    { CATALOG_TRIAL_DAYS: 14 } as never,
  );
  return { svc, prisma, billing };
}

describe("CatalogSubscribeService", () => {
  it("crée l'abonnement avec essai et l'employé depuis la fiche publiée", async () => {
    const { svc, prisma, billing } = setup({
      defaultSwitches: [{ key: "rappel_rdv", label: "Il rappelle les rendez-vous", help: null, enabled: true }],
    });
    await expect(svc.subscribe("org-1", "salon")).resolves.toEqual({ assistantId: "a-new" });

    expect(billing.startCatalogSubscription).toHaveBeenCalledWith({
      organizationId: "org-1",
      formula: "pret-a-l-emploi",
      monthlyCents: 8900,
      trialDays: 14,
    });
    const data = prisma.assistant.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      organizationId: "org-1",
      subscriptionId: "s-new",
      professionSlug: "salon",
      name: "Camille",
      jobDescription: { limits: ["Donner un prix"] },
    });
    expect(data.switches.create).toEqual([
      expect.objectContaining({ organizationId: "org-1", key: "rappel_rdv", enabled: true, position: 0 }),
    ]);
  });

  it("est idempotent : un second clic renvoie le même employé", async () => {
    const { svc, billing } = setup({ existingAssistant: true });
    await expect(svc.subscribe("org-1", "salon")).resolves.toEqual({ assistantId: "a-old" });
    expect(billing.startCatalogSubscription).not.toHaveBeenCalled();
  });

  it("refuse un second contrat dans la même entreprise", async () => {
    const { svc, billing } = setup({ openSubscription: true });
    await expect(svc.subscribe("org-1", "salon")).rejects.toThrow(/déjà un contrat/);
    expect(billing.startCatalogSubscription).not.toHaveBeenCalled();
  });

  it("ignore des boutons par défaut mal formés plutôt que d'échouer", async () => {
    const { svc, prisma } = setup({ defaultSwitches: [{ key: "Mauvaise Clé" }] });
    await svc.subscribe("org-1", "salon");
    expect(prisma.assistant.create.mock.calls[0]?.[0].data.switches).toBeUndefined();
  });
});
