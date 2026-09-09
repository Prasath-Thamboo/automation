/** Abstraction du rail de paiement (§9.3 : logique isolée derrière une interface,
 *  implémentation `fake` pour le dev et les tests). */
export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

export interface CreatePaymentInput {
  amountCents: number;
  currency: string;
  invoiceNumber: string;
  organizationId: string;
  customerEmail: string;
  description: string;
  /** URL de retour après paiement (fournisseurs qui redirigent). */
  returnUrl: string;
}

export interface CreatePaymentResult {
  /** Référence du paiement côté fournisseur, stockée sur `Payment.providerRef`. */
  ref: string;
  /** URL de redirection (Stripe Checkout) ou `null` si paiement sur place (fake). */
  checkoutUrl: string | null;
}

export interface WebhookOutcome {
  /** Identifiant unique de l'évènement — pour l'idempotence. */
  eventId: string;
  type: string;
  /** Référence du paiement concerné (providerRef). */
  paymentRef: string | null;
  result: "succeeded" | "failed" | "ignored";
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Vérifie la signature et interprète un évènement de webhook. `null` si invalide. */
  parseWebhook(rawBody: string, signature: string | undefined): WebhookOutcome | null;
  /** Rembourse un paiement (émission d'un avoir). Optionnel. */
  refund?(paymentRef: string, amountCents: number): Promise<void>;
}
