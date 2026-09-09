import { Logger } from "@nestjs/common";
import type Stripe from "stripe";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  WebhookOutcome,
} from "./payment-provider";

/**
 * Fournisseur Stripe. Le SDK est chargé paresseusement par la fabrique du module
 * (rien n'est importé si `PAYMENT_PROVIDER` vaut `fake`). Stripe ne fait que
 * déplacer l'argent — notre système reste l'autorité sur les numéros et le
 * contenu des factures.
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
      return { ...base, paymentRef: (event.data.object as Stripe.Checkout.Session).id, result: "succeeded" };
    }
    if (event.type === "checkout.session.async_payment_failed") {
      return {
        ...base,
        paymentRef: (event.data.object as Stripe.Checkout.Session).id,
        result: "failed",
        failureReason: "paiement refusé",
      };
    }
    return { ...base, paymentRef: null, result: "ignored" };
  }

  async refund(paymentRef: string, amountCents: number): Promise<void> {
    const session = await this.stripe.checkout.sessions.retrieve(paymentRef, {
      expand: ["payment_intent"],
    });
    const intent = session.payment_intent;
    const intentId = typeof intent === "string" ? intent : intent?.id;
    if (intentId) await this.stripe.refunds.create({ payment_intent: intentId, amount: amountCents });
  }
}
