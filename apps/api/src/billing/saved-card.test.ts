import { UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service";
import { StripePaymentProvider } from "./payment/stripe-payment.provider";

/** Lot 22 — carte enregistrée et prélèvement automatique. */

const invoice = {
  id: "inv-1",
  number: "FAC-2026-0042",
  organizationId: "org-1",
  totalCents: 10680,
  currency: "eur",
};

function setup(opts: { card?: Record<string, unknown> | null; charge?: { ref: string; status: string; failureReason?: string }; provider?: Record<string, unknown> } = {}) {
  const card =
    opts.card === undefined
      ? { id: "card-1", organizationId: "org-1", provider: "fake", status: "active", customerRef: "cus_1", methodRef: "pm_1", setupRef: "setup_1" }
      : opts.card;
  const prisma = {
    subscription: {
      findUnique: vi.fn().mockResolvedValue({
        id: "sub-1",
        organizationId: "org-1",
        status: "active",
        formula: "pret-a-l-emploi",
        monthlyCents: 8900,
        currentPeriodEnd: new Date("2026-12-01T00:00:00Z"),
      }),
    },
    organization: { findUnique: vi.fn().mockResolvedValue({ name: "Garage du Centre" }) },
    membership: { findFirst: vi.fn().mockResolvedValue({ user: { email: "patron@exemple.fr" } }) },
    payment: { create: vi.fn().mockResolvedValue({}) },
    savedCard: {
      findFirst: vi.fn().mockResolvedValue(card),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnValue("update-op"),
      updateMany: vi.fn().mockReturnValue("update-many-op"),
    },
    webhookEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const provider = {
    name: "fake",
    createPayment: vi.fn().mockResolvedValue({ ref: "checkout_1", checkoutUrl: null }),
    parseWebhook: vi.fn(),
    chargeSavedCard: vi.fn().mockResolvedValue(opts.charge ?? { ref: "pi_1", status: "succeeded" }),
    startCardSetup: vi.fn().mockResolvedValue({ ref: "setup_new", checkoutUrl: "https://pay.example/setup", customerRef: "cus_1" }),
    completeCardSetup: vi.fn().mockResolvedValue({
      customerRef: "cus_1",
      methodRef: "pm_new",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2029,
    }),
    detachCard: vi.fn().mockResolvedValue(undefined),
    ...opts.provider,
  };
  const queue = { enqueueBillingJob: vi.fn(), enqueueEmail: vi.fn() };
  const audit = { record: vi.fn() };
  const svc = new BillingService(
    prisma as never,
    {} as never,
    queue as never,
    audit as never,
    { notifyPaymentFailure: vi.fn() } as never,
    provider as never,
    { VAT_RATE_PCT: 20, WEB_ORIGIN: ["http://localhost:3000"] } as never,
  );
  const s = svc as unknown as Record<string, ReturnType<typeof vi.fn>>;
  vi.spyOn(svc, "issueInvoice").mockResolvedValue(invoice as never);
  const succeeded = vi.spyOn(s as never, "markPaymentSucceeded" as never).mockResolvedValue({} as never);
  const failed = vi.spyOn(s as never, "markPaymentFailed" as never).mockResolvedValue({} as never);
  return { svc, prisma, provider, audit, succeeded, failed };
}

describe("prélèvement automatique de la facture mensuelle", () => {
  it("carte enregistrée : la facture est prélevée et marquée payée", async () => {
    const { svc, prisma, provider, succeeded } = setup();
    await svc.runMonthlyBilling("sub-1");

    expect(provider.chargeSavedCard).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 10680, invoiceNumber: "FAC-2026-0042", methodRef: "pm_1", customerRef: "cus_1" }),
    );
    expect(provider.createPayment).not.toHaveBeenCalled();
    expect(prisma.payment.create.mock.calls[0]?.[0].data).toMatchObject({ providerRef: "pi_1", method: "carte", status: "en_attente" });
    expect(succeeded).toHaveBeenCalledWith("pi_1", "auto_FAC-2026-0042");
  });

  it("prélèvement refusé : la facture passe impayée avec la raison (le client est prévenu)", async () => {
    const { svc, failed, succeeded } = setup({ charge: { ref: "pi_2", status: "failed", failureReason: "carte expirée" } });
    await svc.runMonthlyBilling("sub-1");
    expect(failed).toHaveBeenCalledWith("pi_2", "carte expirée");
    expect(succeeded).not.toHaveBeenCalled();
  });

  it("résultat différé : on attend le webhook", async () => {
    const { svc, failed, succeeded } = setup({ charge: { ref: "pi_3", status: "processing" } });
    await svc.runMonthlyBilling("sub-1");
    expect(failed).not.toHaveBeenCalled();
    expect(succeeded).not.toHaveBeenCalled();
  });

  it("sans carte : paiement facture par facture, comme avant", async () => {
    const { svc, provider } = setup({ card: null });
    await svc.runMonthlyBilling("sub-1");
    expect(provider.chargeSavedCard).not.toHaveBeenCalled();
    expect(provider.createPayment).toHaveBeenCalled();
  });
});

describe("enregistrement et retrait de la carte", () => {
  it("ouvre une session et garde la trace en attente", async () => {
    const { svc, prisma, provider } = setup();
    const info = await svc.startCardSetup("org-1", "patron@exemple.fr");
    expect(info).toEqual({ provider: "fake", setupRef: "setup_new", checkoutUrl: "https://pay.example/setup" });
    expect(provider.startCardSetup).toHaveBeenCalledWith(expect.objectContaining({ customerRef: "cus_1" }));
    expect(prisma.savedCard.create.mock.calls[0]?.[0].data).toMatchObject({ setupRef: "setup_new", organizationId: "org-1" });
  });

  it("fournisseur sans enregistrement de carte → message orienté action", async () => {
    const { svc } = setup({ provider: { startCardSetup: undefined } });
    await expect(svc.startCardSetup("org-1", "x@y.fr")).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("confirmation : la nouvelle carte devient la seule active, l'ancienne est retirée chez le fournisseur", async () => {
    const { svc, prisma, provider, audit } = setup();
    prisma.savedCard.findUnique.mockResolvedValue({ id: "card-2", organizationId: "org-1", provider: "fake", status: "en_attente", customerRef: "cus_1" });
    prisma.savedCard.findMany.mockResolvedValue([{ id: "card-1", methodRef: "pm_old" }]);

    await svc.completeCardSetup("setup_new");

    expect(prisma.savedCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["card-1"] } }, data: expect.objectContaining({ status: "retiree" }) }),
    );
    expect(prisma.savedCard.update.mock.calls[0]?.[0].data).toMatchObject({ status: "active", methodRef: "pm_new", last4: "4242" });
    expect(provider.detachCard).toHaveBeenCalledWith("pm_old");
    // Audit sans donnée de carte.
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain("4242");
  });

  it("confirmation rejouée (webhook en double) : rien ne change", async () => {
    const { svc, prisma, provider } = setup();
    prisma.savedCard.findUnique.mockResolvedValue({ id: "card-2", status: "active" });
    await svc.completeCardSetup("setup_new");
    expect(provider.completeCardSetup).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retrait : statut retirée et carte détachée", async () => {
    const { svc, prisma, provider } = setup();
    prisma.savedCard.findMany.mockResolvedValue([{ id: "card-1", methodRef: "pm_1" }]);
    await svc.removeSavedCard("org-1", "user-1");
    expect(prisma.savedCard.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "retiree" }) }),
    );
    expect(provider.detachCard).toHaveBeenCalledWith("pm_1");
  });
});

describe("webhooks", () => {
  it("carte enregistrée chez le fournisseur → confirmée chez nous", async () => {
    const { svc, provider } = setup();
    provider.parseWebhook.mockReturnValue({ eventId: "evt_1", type: "checkout.session.completed", paymentRef: null, result: "setup_succeeded", setupRef: "setup_new" });
    const complete = vi.spyOn(svc, "completeCardSetup").mockResolvedValue();
    await expect(svc.handleWebhook("{}", "sig")).resolves.toEqual({ ok: true });
    expect(complete).toHaveBeenCalledWith("setup_new");
  });

  it("évènement sans correspondance : acquitté, pas renvoyé indéfiniment", async () => {
    const { svc, provider, prisma, succeeded } = setup();
    provider.parseWebhook.mockReturnValue({ eventId: "evt_2", type: "payment_intent.succeeded", paymentRef: "pi_inconnu", result: "succeeded" });
    const { NotFoundException } = await import("@nestjs/common");
    succeeded.mockRejectedValueOnce(new NotFoundException("Paiement introuvable."));
    await expect(svc.handleWebhook("{}", "sig")).resolves.toEqual({ ok: true });
    expect(prisma.webhookEvent.update).toHaveBeenCalled();
  });
});

describe("fournisseur Stripe — lecture des évènements et refus", () => {
  const stripeWith = (event: unknown, extra: Record<string, unknown> = {}) =>
    new StripePaymentProvider({ webhooks: { constructEvent: () => event }, ...extra } as never, "whsec");

  it("session « setup » terminée → setup_succeeded", () => {
    const p = stripeWith({ id: "evt", type: "checkout.session.completed", data: { object: { id: "cs_1", mode: "setup" } } });
    expect(p.parseWebhook("{}", "sig")).toMatchObject({ result: "setup_succeeded", setupRef: "cs_1", paymentRef: null });
  });

  it("payment_intent : seuls nos prélèvements automatiques comptent", () => {
    const ours = stripeWith({ id: "e1", type: "payment_intent.payment_failed", data: { object: { id: "pi_1", metadata: { automatic: "1" } } } });
    expect(ours.parseWebhook("{}", "sig")).toMatchObject({ result: "failed", paymentRef: "pi_1" });
    const checkout = stripeWith({ id: "e2", type: "payment_intent.succeeded", data: { object: { id: "pi_2", metadata: {} } } });
    expect(checkout.parseWebhook("{}", "sig")).toMatchObject({ result: "ignored" });
  });

  it("refus de la banque → échec avec une raison lisible, jamais d'exception", async () => {
    const p = stripeWith(null, {
      paymentIntents: {
        create: vi.fn().mockRejectedValue({ code: "authentication_required", payment_intent: { id: "pi_9" } }),
      },
    });
    await expect(
      p.chargeSavedCard({ amountCents: 100, currency: "eur", invoiceNumber: "FAC-1", organizationId: "o", description: "d", customerRef: "cus", methodRef: "pm" }),
    ).resolves.toEqual({ ref: "pi_9", status: "failed", failureReason: "votre banque demande une confirmation" });
  });
});
