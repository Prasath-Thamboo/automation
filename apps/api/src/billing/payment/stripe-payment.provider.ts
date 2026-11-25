import { Logger } from "@nestjs/common";
import type Stripe from "stripe";
import type {
  ChargeSavedCardInput,
  ChargeSavedCardResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  SavedCardDetails,
  StartCardSetupInput,
  StartCardSetupResult,
  WebhookOutcome,
} from "./payment-provider";

/** Marque les prélèvements automatiques : seuls leurs évènements `payment_intent.*` nous concernent. */
const AUTOMATIC = "automatic";

/**
 * Fournisseur Stripe. Le SDK est chargé paresseusement par la fabrique du module
 * (rien n'est importé si `PAYMENT_PROVIDER` vaut `fake`). Stripe ne fait que
 * déplacer l'argent — notre système reste l'autorité sur les numéros et le
 * contenu des factures.
 *
 * Lot 22 : carte enregistrée par une session Checkout en mode `setup`, puis
 * prélevée « hors session » (PaymentIntent `off_session` + `confirm`) à chaque
 * facture mensuelle.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly logger = new Logger("StripePayment");

  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      payment_method_types: ["card", "sepa_debit"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: { name: input.description },
          },
        },
      ],
      metadata: { invoiceNumber: input.invoiceNumber, organizationId: input.organizationId },
      success_url: `${input.returnUrl}?paiement=ok`,
      cancel_url: `${input.returnUrl}?paiement=annule`,
    });
    return { ref: session.id, checkoutUrl: session.url };
  }

  parseWebhook(rawBody: string, signature: string | undefined): WebhookOutcome | null {
    if (!signature) return null;
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      this.logger.warn(`Signature de webhook invalide : ${(error as Error).message}`);
      return null;
    }

    const base = { eventId: event.id, type: event.type };
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "setup") {
        return { ...base, paymentRef: null, result: "setup_succeeded", setupRef: session.id };
      }
      return { ...base, paymentRef: session.id, result: "succeeded" };
    }
    if (event.type === "checkout.session.async_payment_failed") {
      return {
        ...base,
        paymentRef: (event.data.object as Stripe.Checkout.Session).id,
        result: "failed",
        failureReason: "paiement refusé",
      };
    }
    // Prélèvements automatiques dont le résultat arrive après coup.
    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.[AUTOMATIC] !== "1") return { ...base, paymentRef: null, result: "ignored" };
      return event.type === "payment_intent.succeeded"
        ? { ...base, paymentRef: intent.id, result: "succeeded" }
        : { ...base, paymentRef: intent.id, result: "failed", failureReason: "prélèvement refusé" };
    }
    return { ...base, paymentRef: null, result: "ignored" };
  }

  async refund(paymentRef: string, amountCents: number): Promise<void> {
    // Prélèvement automatique : la référence est directement le PaymentIntent.
    if (paymentRef.startsWith("pi_")) {
      await this.stripe.refunds.create({ payment_intent: paymentRef, amount: amountCents });
      return;
    }
    const session = await this.stripe.checkout.sessions.retrieve(paymentRef, {
      expand: ["payment_intent"],
    });
    const intent = session.payment_intent;
    const intentId = typeof intent === "string" ? intent : intent?.id;
    if (intentId) await this.stripe.refunds.create({ payment_intent: intentId, amount: amountCents });
  }

  async startCardSetup(input: StartCardSetupInput): Promise<StartCardSetupResult> {
    const customerRef =
      input.customerRef ??
      (
        await this.stripe.customers.create({
          email: input.customerEmail,
          metadata: { organizationId: input.organizationId },
        })
      ).id;
    const session = await this.stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerRef,
      currency: "eur",
      payment_method_types: ["card"],
      metadata: { organizationId: input.organizationId },
      success_url: `${input.returnUrl}?carte=ok`,
      cancel_url: `${input.returnUrl}?carte=annule`,
    });
    return { ref: session.id, checkoutUrl: session.url, customerRef };
  }

  async completeCardSetup(setupRef: string): Promise<SavedCardDetails | null> {
    const session = await this.stripe.checkout.sessions.retrieve(setupRef, {
      expand: ["setup_intent.payment_method"],
    });
    if (session.status !== "complete") return null;
    const intent = session.setup_intent;
    if (!intent || typeof intent === "string") return null;
    const method = intent.payment_method;
    if (!method || typeof method === "string") return null;
    return {
      customerRef: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
      methodRef: method.id,
      brand: method.card?.brand ?? null,
      last4: method.card?.last4 ?? null,
      expMonth: method.card?.exp_month ?? null,
      expYear: method.card?.exp_year ?? null,
    };
  }

  async chargeSavedCard(input: ChargeSavedCardInput): Promise<ChargeSavedCardResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: input.amountCents,
          currency: input.currency,
          customer: input.customerRef ?? undefined,
          payment_method: input.methodRef,
          off_session: true,
          confirm: true,
          description: input.description,
          metadata: { invoiceNumber: input.invoiceNumber, organizationId: input.organizationId, [AUTOMATIC]: "1" },
        },
        // Une facture n'est prélevée qu'une fois, même si le job est rejoué.
        { idempotencyKey: `velekya-charge-${input.invoiceNumber}` },
      );
      if (intent.status === "succeeded") return { ref: intent.id, status: "succeeded" };
      if (intent.status === "processing") return { ref: intent.id, status: "processing" };
      return { ref: intent.id, status: "failed", failureReason: "prélèvement refusé" };
    } catch (error) {
      const e = error as { code?: string; payment_intent?: { id?: string }; message?: string };
      const reason =
        e.code === "authentication_required"
          ? "votre banque demande une confirmation"
          : e.code === "expired_card"
            ? "carte expirée"
            : "carte refusée";
      this.logger.warn(`Prélèvement refusé pour ${input.invoiceNumber} : ${e.code ?? e.message ?? "inconnu"}`);
      return { ref: e.payment_intent?.id ?? `refus_${input.invoiceNumber}`, status: "failed", failureReason: reason };
    }
  }

  async detachCard(methodRef: string): Promise<void> {
    await this.stripe.paymentMethods.detach(methodRef);
  }
}
