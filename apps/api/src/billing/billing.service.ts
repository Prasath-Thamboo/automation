import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, type Invoice, type SavedCard } from "@prisma/client";
import type {
  CardSetupInfo,
  CheckoutInfo,
  CreditNoteDoc,
  DocumentsBundle,
  InvoiceDoc,
  InvoiceKind,
  PaymentOutcome,
  SavedCardView,
  SubscriptionStatus,
  SubscriptionSummary,
} from "@velekya/types";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { PushService } from "../notifications/push.service";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./payment/payment-provider";
import { SequenceService } from "./sequence.service";
import {
  freezeInvoiceContent,
  splitTtc,
  toCreditNoteDoc,
  toInvoiceDoc,
} from "./invoice-content";
import { paymentFailedEmail, paymentReceivedEmail } from "./billing-mail.templates";

const DAY = 24 * 60 * 60 * 1000;

interface IssueInvoiceInput {
  organizationId: string;
  orgName: string;
  subscriptionId: string;
  kind: InvoiceKind;
  lines: { label: string; quantity: number; unitCents: number }[];
  periodStart?: Date;
  periodEnd?: Date;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger("Billing");

  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: SequenceService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly push: PushService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  /** Appelé à l'acceptation d'un devis (§4.3) : abonnement + facture de mise en service. */
  async onQuoteAccepted(input: {
    organizationId: string;
    quoteId: string;
    orgName: string;
    formula: string;
    monthlyCents: number;
    setupCents: number;
  }): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { quoteId: input.quoteId },
    });
    if (existing) return;

    const sub = await this.prisma.subscription.create({
      data: {
        organizationId: input.organizationId,
        quoteId: input.quoteId,
        formula: input.formula,
        monthlyCents: input.monthlyCents,
        setupCents: input.setupCents,
        vatRatePct: this.env.VAT_RATE_PCT,
        status: "incomplete",
      },
    });

    if (input.setupCents > 0) {
      await this.issueInvoice({
        organizationId: input.organizationId,
        orgName: input.orgName,
        subscriptionId: sub.id,
        kind: "mise_en_service",
        lines: [
          { label: "Mise en service de votre employé virtuel", quantity: 1, unitCents: input.setupCents },
        ],
      });
    } else {
      await this.activateSubscription(sub.id);
    }
  }

  /**
   * Lot 16 — abonnement « prêt à l'emploi » souscrit en libre-service : pas de
   * mise en service, essai gratuit de `trialDays` jours. La première facture
   * mensuelle part à la fin de l'essai (file `billing`) ; résilier avant = rien
   * à payer. Sans carte enregistrée (Lot 22), le client règle chaque facture
   * depuis « Mes documents » ; avec, elle est prélevée à son émission.
   */
  async startCatalogSubscription(input: {
    organizationId: string;
    formula: string;
    monthlyCents: number;
    trialDays: number;
  }): Promise<{ id: string }> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + Math.max(0, input.trialDays) * DAY);
    const sub = await this.prisma.subscription.create({
      data: {
        organizationId: input.organizationId,
        formula: input.formula,
        monthlyCents: input.monthlyCents,
        setupCents: 0,
        vatRatePct: this.env.VAT_RATE_PCT,
        status: "active",
        startedAt: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: input.trialDays > 0 ? trialEnd : null,
        providerRef: this.provider.name,
      },
    });
    await this.queue.enqueueBillingJob(
      { type: "monthly", subscriptionId: sub.id },
      trialEnd.getTime() - now.getTime(),
    );
    await this.audit.record({
      organizationId: input.organizationId,
      action: "subscription.activated",
      target: `subscription:${sub.id}`,
      metadata: { formula: input.formula, trialDays: input.trialDays },
    });
    return { id: sub.id };
  }

  /** Résiliation (§6). L'abonnement s'arrête ; les factures restent inchangées. */
  async cancelSubscription(organizationId: string): Promise<SubscriptionSummary | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId, status: { in: ["active", "past_due", "paused", "incomplete"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) return null;
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "canceled", canceledAt: new Date() },
    });
    await this.audit.record({
      organizationId,
      action: "subscription.canceled",
      target: `subscription:${sub.id}`,
    });
    return toSubSummary(updated);
  }

  async issueInvoice(input: IssueInvoiceInput): Promise<Invoice> {
    const number = await this.seq.next("FAC");
    const vatRatePct = this.env.VAT_RATE_PCT;
    const subtotalCents = input.lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
    const vatCents = Math.round((subtotalCents * vatRatePct) / 100);

    const invoice = await this.prisma.invoice.create({
      data: {
        number,
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId,
        kind: input.kind,
        status: "emise",
        currency: "eur",
        vatRatePct,
        subtotalCents,
        vatCents,
        totalCents: subtotalCents + vatCents,
        dueAt: new Date(Date.now() + 15 * DAY),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        content: freezeInvoiceContent(this.env, input.orgName) as unknown as Prisma.InputJsonValue,
        lineItems: {
          create: input.lines.map((l, i) => ({
            label: l.label,
            quantity: l.quantity,
            unitCents: l.unitCents,
            totalCents: l.unitCents * l.quantity,
            position: i,
          })),
        },
      },
    });

    await this.audit.record({
      organizationId: input.organizationId,
      action: "invoice.issued",
      target: `invoice:${invoice.id}`,
      metadata: { number, totalCents: invoice.totalCents, kind: input.kind },
    });
    return invoice;
  }

  /** Démarre (ou reprend) le paiement d'une facture par le client. */
  async startPayment(
    organizationId: string,
    invoiceNumber: string,
    email: string,
  ): Promise<CheckoutInfo> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { number: invoiceNumber, organizationId },
      include: { lineItems: true, payments: { where: { status: "en_attente" } } },
    });
    if (!invoice) throw new NotFoundException("Cette facture est introuvable.");
    if (invoice.status === "payee") throw new ConflictException("Cette facture est déjà réglée.");
    if (invoice.status === "annulee") throw new ConflictException("Cette facture a été annulée.");

    const pending = invoice.payments[0];
    if (pending?.providerRef) {
      return {
        provider: this.provider.name,
        paymentRef: pending.providerRef,
        invoiceNumber,
        amountEur: invoice.totalCents / 100,
        checkoutUrl: null,
      };
    }

    const created = await this.provider.createPayment({
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      invoiceNumber,
      organizationId,
      customerEmail: email,
      description: invoice.lineItems[0]?.label ?? `Facture ${invoiceNumber}`,
      returnUrl: `${webBaseUrl(this.env)}/mon-equipe/documents`,
    });
    await this.prisma.payment.create({
      data: {
        organizationId,
        invoiceId: invoice.id,
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "en_attente",
        provider: this.provider.name,
        providerRef: created.ref,
      },
    });

    return {
      provider: this.provider.name,
      paymentRef: created.ref,
      invoiceNumber,
      amountEur: invoice.totalCents / 100,
      checkoutUrl: created.checkoutUrl,
    };
  }

  /** Mode `fake` uniquement : le client confirme le paiement lui-même. */
  async confirmFakePayment(organizationId: string, paymentRef: string): Promise<PaymentOutcome> {
    if (this.provider.name !== "fake") {
      throw new ForbiddenException("La confirmation manuelle n'est pas disponible.");
    }
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: paymentRef, organizationId },
    });
    if (!payment) throw new NotFoundException("Paiement introuvable.");
    return this.markPaymentSucceeded(paymentRef, `fake_confirm_${Date.now()}`);
  }

  /** Webhook fournisseur, idempotent (§10 Lot 4). */
  async handleWebhook(rawBody: string, signature: string | undefined): Promise<{ ok: true }> {
    const outcome = this.provider.parseWebhook(rawBody, signature);
    if (!outcome) throw new UnprocessableEntityException("Évènement de paiement invalide.");

    const seen = await this.prisma.webhookEvent.findUnique({ where: { id: outcome.eventId } });
    if (seen?.processedAt) return { ok: true };
    await this.prisma.webhookEvent.upsert({
      where: { id: outcome.eventId },
      create: { id: outcome.eventId, provider: this.provider.name, type: outcome.type },
      update: {},
    });

    try {
      if (outcome.result === "succeeded" && outcome.paymentRef) {
        await this.markPaymentSucceeded(outcome.paymentRef, outcome.eventId);
      } else if (outcome.result === "failed" && outcome.paymentRef) {
        await this.markPaymentFailed(outcome.paymentRef, outcome.failureReason ?? "paiement refusé");
      } else if (outcome.result === "setup_succeeded" && outcome.setupRef) {
        await this.completeCardSetup(outcome.setupRef);
      }
    } catch (error) {
      // Un évènement qui ne correspond à rien chez nous ne doit pas être renvoyé
      // indéfiniment par le fournisseur : on le note et on l'acquitte.
      if (!(error instanceof NotFoundException)) throw error;
      this.logger.warn(`Évènement ${outcome.type} sans correspondance (${outcome.eventId}), ignoré.`);
    }

    await this.prisma.webhookEvent.update({
      where: { id: outcome.eventId },
      data: { processedAt: new Date() },
    });
    return { ok: true };
  }

  private async markPaymentSucceeded(providerRef: string, eventId: string): Promise<PaymentOutcome> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef },
      include: { invoice: { include: { subscription: true } } },
    });
    if (!payment) throw new NotFoundException("Paiement introuvable.");
    if (payment.status === "reussi") return this.outcomeFor(payment.invoiceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "reussi", paidAt: new Date(), method: "carte" },
      });
      if (payment.invoiceId) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: "payee", paidAt: new Date() },
        });
      }
    });

    const invoice = payment.invoice;
    if (invoice?.subscription) {
      if (invoice.kind === "mise_en_service" && invoice.subscription.status === "incomplete") {
        await this.activateSubscription(invoice.subscription.id);
      } else if (invoice.kind === "abonnement") {
        await this.advanceSubscription(invoice.subscription.id);
      }
    }

    await this.audit.record({
      organizationId: payment.organizationId,
      action: "payment.succeeded",
      target: `payment:${payment.id}`,
      metadata: { eventId, providerRef },
    });
    if (invoice) {
      const email = await this.orgOwnerEmail(payment.organizationId);
      if (email) {
        await this.queue.enqueueEmail(
          paymentReceivedEmail(
            email,
            invoice.number,
            invoice.totalCents / 100,
            `${webBaseUrl(this.env)}/mon-equipe/documents`,
          ),
        );
      }
    }
    return this.outcomeFor(payment.invoiceId);
  }

  private async markPaymentFailed(providerRef: string, reason: string): Promise<PaymentOutcome> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef },
      include: { invoice: { include: { subscription: true } } },
    });
    if (!payment) throw new NotFoundException("Paiement introuvable.");

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "echoue", failureReason: reason.slice(0, 300) },
      });
      if (payment.invoiceId) {
        await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: "impayee" } });
      }
      if (payment.invoice?.subscription?.status === "active") {
        await tx.subscription.update({
          where: { id: payment.invoice.subscription.id },
          data: { status: "past_due" },
        });
      }
    });

    await this.audit.record({
      organizationId: payment.organizationId,
      action: "payment.failed",
      target: `payment:${payment.id}`,
      metadata: { providerRef, reason },
    });
    if (payment.invoice) {
      const email = await this.orgOwnerEmail(payment.organizationId);
      if (email) {
        await this.queue.enqueueEmail(
          paymentFailedEmail(
            email,
            payment.invoice.number,
            `${webBaseUrl(this.env)}/mon-equipe/documents`,
          ),
        );
      }
      await this.push.notifyPaymentFailure({
        organizationId: payment.organizationId,
        invoiceNumber: payment.invoice.number,
      });
    }
    return this.outcomeFor(payment.invoiceId);
  }

  private async activateSubscription(subscriptionId: string): Promise<void> {
    const now = new Date();
    const periodEnd = addMonths(now, 1);
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        startedAt: now,
        currentPeriodEnd: periodEnd,
        providerRef: this.provider.name,
      },
    });
    await this.queue.enqueueBillingJob(
      { type: "monthly", subscriptionId },
      periodEnd.getTime() - now.getTime(),
    );
    await this.audit.record({
      action: "subscription.activated",
      target: `subscription:${subscriptionId}`,
    });
  }

  private async advanceSubscription(subscriptionId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    const base =
      sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "active", currentPeriodEnd: addMonths(base, 1) },
    });
  }

  /** Job mensuel : émet la facture d'abonnement, tente le paiement, se reprogramme. */
  async runMonthlyBilling(subscriptionId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub || (sub.status !== "active" && sub.status !== "past_due")) return;

    const org = await this.prisma.organization.findUnique({ where: { id: sub.organizationId } });
    const orgName = org?.name ?? "Votre entreprise";
    const periodStart = sub.currentPeriodEnd ?? new Date();
    const periodEnd = addMonths(periodStart, 1);

    const invoice = await this.issueInvoice({
      organizationId: sub.organizationId,
      orgName,
      subscriptionId: sub.id,
      kind: "abonnement",
      lines: [
        { label: `Abonnement mensuel — ${sub.formula}`, quantity: 1, unitCents: sub.monthlyCents },
      ],
      periodStart,
      periodEnd,
    });

    // Lot 22 — carte enregistrée : la facture est prélevée tout de suite.
    const card = await this.activeCard(sub.organizationId);
    if (card?.methodRef && this.provider.chargeSavedCard) {
      await this.chargeCard(card, invoice);
    } else {
      const email = await this.orgOwnerEmail(sub.organizationId);
      const created = await this.provider.createPayment({
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        invoiceNumber: invoice.number,
        organizationId: sub.organizationId,
        customerEmail: email ?? "",
        description: `Abonnement ${invoice.number}`,
        returnUrl: `${webBaseUrl(this.env)}/mon-equipe/documents`,
      });
      await this.prisma.payment.create({
        data: {
          organizationId: sub.organizationId,
          invoiceId: invoice.id,
          amountCents: invoice.totalCents,
          currency: invoice.currency,
          status: "en_attente",
          provider: this.provider.name,
          providerRef: created.ref,
        },
      });

      // En mode démo, le rail encaisse tout de suite.
      if (this.provider.name === "fake") {
        await this.markPaymentSucceeded(created.ref, `fake_auto_${invoice.number}`);
      }
    }

    await this.queue.enqueueBillingJob(
      { type: "monthly", subscriptionId: sub.id },
      periodEnd.getTime() - Date.now(),
    );
  }

  // ── Lot 22 : carte enregistrée, prélèvement automatique ──────────────────

  /** Ouvre l'enregistrement d'une carte (remplace la carte actuelle une fois confirmé). */
  async startCardSetup(organizationId: string, email: string): Promise<CardSetupInfo> {
    if (!this.provider.startCardSetup) {
      throw new UnprocessableEntityException(
        "L'enregistrement d'une carte n'est pas disponible pour le moment. Vous pouvez régler chaque facture depuis cette page.",
      );
    }
    const current = await this.activeCard(organizationId);
    const started = await this.provider.startCardSetup({
      organizationId,
      customerEmail: email,
      customerRef: current?.customerRef ?? null,
      returnUrl: `${webBaseUrl(this.env)}/mon-equipe/documents`,
    });
    await this.prisma.savedCard.create({
      data: {
        organizationId,
        provider: this.provider.name,
        setupRef: started.ref,
        customerRef: started.customerRef,
      },
    });
    return { provider: this.provider.name, setupRef: started.ref, checkoutUrl: started.checkoutUrl };
  }

  /** Mode `fake` uniquement : le client confirme l'enregistrement lui-même. */
  async confirmFakeCardSetup(organizationId: string, setupRef: string): Promise<SavedCardView | null> {
    if (this.provider.name !== "fake") {
      throw new ForbiddenException("La confirmation manuelle n'est pas disponible.");
    }
    const pending = await this.prisma.savedCard.findFirst({ where: { setupRef, organizationId } });
    if (!pending) throw new NotFoundException("Cet enregistrement de carte est introuvable.");
    await this.completeCardSetup(setupRef);
    return this.savedCardFor(organizationId);
  }

  /**
   * Termine un enregistrement (webhook ou confirmation de démo) : la nouvelle carte
   * devient la seule active, l'ancienne est retirée chez le fournisseur. Idempotent.
   */
  async completeCardSetup(setupRef: string): Promise<void> {
    const row = await this.prisma.savedCard.findUnique({ where: { setupRef } });
    if (!row) throw new NotFoundException("Cet enregistrement de carte est introuvable.");
    if (row.status !== "en_attente") return;
    const details = await this.provider.completeCardSetup?.(setupRef);
    if (!details) return;

    const now = new Date();
    const previous = await this.prisma.savedCard.findMany({
      where: { organizationId: row.organizationId, status: "active", id: { not: row.id } },
    });
    await this.prisma.$transaction([
      this.prisma.savedCard.updateMany({
        where: { id: { in: previous.map((p) => p.id) } },
        data: { status: "retiree", removedAt: now },
      }),
      this.prisma.savedCard.update({
        where: { id: row.id },
        data: {
          status: "active",
          activatedAt: now,
          customerRef: details.customerRef ?? row.customerRef,
          methodRef: details.methodRef,
          brand: details.brand,
          last4: details.last4,
          expMonth: details.expMonth,
          expYear: details.expYear,
        },
      }),
    ]);
    for (const old of previous) await this.detachQuietly(old);

    await this.audit.record({
      organizationId: row.organizationId,
      action: "saved_card.added",
      target: `saved_card:${row.id}`,
      metadata: { provider: row.provider, replaced: previous.length },
    });
  }

  /** Retire la carte : les prochaines factures se règlent depuis « Mes documents ». */
  async removeSavedCard(organizationId: string, actorUserId?: string): Promise<void> {
    const cards = await this.prisma.savedCard.findMany({
      where: { organizationId, status: { in: ["active", "en_attente"] } },
    });
    if (cards.length === 0) return;
    await this.prisma.savedCard.updateMany({
      where: { id: { in: cards.map((c) => c.id) } },
      data: { status: "retiree", removedAt: new Date() },
    });
    for (const card of cards) await this.detachQuietly(card);
    await this.audit.record({
      organizationId,
      actorUserId,
      action: "saved_card.removed",
      metadata: { count: cards.length },
    });
  }

  async savedCardFor(organizationId: string): Promise<SavedCardView | null> {
    const card = await this.activeCard(organizationId);
    return card ? toSavedCardView(card) : null;
  }

  private activeCard(organizationId: string): Promise<SavedCard | null> {
    return this.prisma.savedCard.findFirst({
      where: { organizationId, status: "active" },
      orderBy: { activatedAt: "desc" },
    });
  }

  /** Prélève la carte enregistrée pour une facture. Échec → facture impayée, client prévenu. */
  private async chargeCard(card: SavedCard, invoice: Invoice): Promise<void> {
    const charge = await this.provider.chargeSavedCard!({
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      invoiceNumber: invoice.number,
      organizationId: invoice.organizationId,
      description: `Abonnement ${invoice.number}`,
      customerRef: card.customerRef,
      methodRef: card.methodRef!,
    });
    await this.prisma.payment.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "en_attente",
        method: "carte",
        provider: this.provider.name,
        providerRef: charge.ref,
      },
    });
    if (charge.status === "succeeded") {
      await this.markPaymentSucceeded(charge.ref, `auto_${invoice.number}`);
    } else if (charge.status === "failed") {
      await this.markPaymentFailed(charge.ref, charge.failureReason ?? "prélèvement refusé");
    }
    // `processing` : le résultat arrivera par webhook.
  }

  private async detachQuietly(card: SavedCard): Promise<void> {
    if (!card.methodRef || !this.provider.detachCard) return;
    try {
      await this.provider.detachCard(card.methodRef);
    } catch (error) {
      this.logger.warn(`Retrait de carte chez le fournisseur impossible : ${(error as Error).message}`);
    }
  }

  /** Avoir (§4.3) : la facture n'est jamais modifiée, on émet un document distinct. */
  async issueCreditNote(
    invoiceId: string,
    reason: string,
    amountEur: number | undefined,
    actorUserId: string,
  ): Promise<CreditNoteDoc> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException("Cette facture n'existe pas.");
    if (invoice.status === "annulee") {
      throw new ConflictException("Cette facture est déjà entièrement créditée.");
    }

    const credited =
      (await this.prisma.creditNote.aggregate({
        where: { invoiceId },
        _sum: { totalCents: true },
      }))._sum.totalCents ?? 0;
    const totalCents =
      amountEur != null ? Math.round(amountEur * 100) : invoice.totalCents - credited;
    if (totalCents <= 0 || credited + totalCents > invoice.totalCents) {
      throw new UnprocessableEntityException({
        message: "Le montant de l'avoir dépasse le restant à créditer.",
      });
    }

    const vatRatePct = invoice.vatRatePct;
    const { subtotalCents, vatCents } = splitTtc(totalCents, vatRatePct);
    const number = await this.seq.next("AV");

    const cn = await this.prisma.creditNote.create({
      data: {
        number,
        invoiceId,
        organizationId: invoice.organizationId,
        reason,
        currency: invoice.currency,
        vatRatePct,
        subtotalCents,
        vatCents,
        totalCents,
        content: invoice.content as Prisma.InputJsonValue,
      },
      include: { invoice: { select: { number: true } } },
    });

    if (credited + totalCents >= invoice.totalCents) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "annulee", voidedAt: new Date() },
      });
    }

    const paid = await this.prisma.payment.findFirst({
      where: { invoiceId, status: "reussi" },
    });
    if (paid?.providerRef && this.provider.refund) {
      try {
        await this.provider.refund(paid.providerRef, totalCents);
        await this.prisma.payment.update({ where: { id: paid.id }, data: { status: "rembourse" } });
      } catch (error) {
        this.logger.warn(`Remboursement fournisseur impossible : ${(error as Error).message}`);
      }
    }

    await this.audit.record({
      actorUserId,
      organizationId: invoice.organizationId,
      action: "credit_note.issued",
      target: `invoice:${invoiceId}`,
      metadata: { number, totalCents },
    });
    return toCreditNoteDoc(cn);
  }

  // ── Lectures ─────────────────────────────────────────────────────────────

  async documentsFor(organizationId: string): Promise<DocumentsBundle> {
    const [sub, invoices, creditNotes, savedCard] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId },
        include: { lineItems: true },
        orderBy: { issuedAt: "desc" },
      }),
      this.prisma.creditNote.findMany({
        where: { organizationId },
        include: { invoice: { select: { number: true } } },
        orderBy: { issuedAt: "desc" },
      }),
      this.savedCardFor(organizationId),
    ]);
    return {
      subscription: sub ? toSubSummary(sub) : null,
      invoices: invoices.map(toInvoiceDoc),
      creditNotes: creditNotes.map(toCreditNoteDoc),
      savedCard,
    };
  }

  async invoiceDoc(organizationId: string, number: string): Promise<InvoiceDoc> {
    const inv = await this.prisma.invoice.findFirst({
      where: { number, organizationId },
      include: { lineItems: true },
    });
    if (!inv) throw new NotFoundException("Cette facture est introuvable.");
    return toInvoiceDoc(inv);
  }

  private async outcomeFor(invoiceId: string | null): Promise<PaymentOutcome> {
    if (!invoiceId) {
      return { paymentStatus: "reussi", invoiceStatus: "payee", subscriptionStatus: "active" };
    }
    const inv = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { subscription: true },
    });
    const lastPayment = await this.prisma.payment.findFirst({
      where: { invoiceId },
      orderBy: { updatedAt: "desc" },
    });
    return {
      paymentStatus: (lastPayment?.status ?? "en_attente") as PaymentOutcome["paymentStatus"],
      invoiceStatus: inv.status as PaymentOutcome["invoiceStatus"],
      subscriptionStatus: (inv.subscription?.status ?? "incomplete") as SubscriptionStatus,
    };
  }

  private async orgOwnerEmail(organizationId: string): Promise<string | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId, role: "owner", deletedAt: null },
      include: { user: true },
    });
    return membership?.user.email ?? null;
  }
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toSavedCardView(card: SavedCard): SavedCardView {
  return {
    brand: card.brand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
    activatedAt: (card.activatedAt ?? card.createdAt).toISOString(),
  };
}

function toSubSummary(sub: {
  status: string;
  formula: string;
  currency: string;
  monthlyCents: number;
  setupCents: number;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
}): SubscriptionSummary {
  return {
    status: sub.status as SubscriptionStatus,
    formula: sub.formula,
    currency: sub.currency,
    monthlyEur: sub.monthlyCents / 100,
    setupEur: sub.setupCents / 100,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
  };
}
