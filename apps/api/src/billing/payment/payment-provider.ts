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
  /** `setup_succeeded` : une carte vient d'être enregistrée (Lot 22), voir `setupRef`. */
  result: "succeeded" | "failed" | "setup_succeeded" | "ignored";
  failureReason?: string;
  /** Session d'enregistrement de carte concernée (`SavedCard.setupRef`). */
  setupRef?: string | null;
}

// ── Lot 22 : carte enregistrée, prélèvement automatique ──────────────────────

export interface StartCardSetupInput {
  organizationId: string;
  customerEmail: string;
  /** Client déjà connu du fournisseur (carte précédente), sinon `null`. */
  customerRef: string | null;
  returnUrl: string;
}

export interface StartCardSetupResult {
  /** Référence de la session d'enregistrement, stockée sur `SavedCard.setupRef`. */
  ref: string;
  /** URL de redirection (Stripe) ou `null` en mode `fake`. */
  checkoutUrl: string | null;
  customerRef: string | null;
}

/** Ce que l'on garde d'une carte : des références et de quoi l'afficher, jamais son numéro. */
export interface SavedCardDetails {
  customerRef: string | null;
  methodRef: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export interface ChargeSavedCardInput {
  amountCents: number;
  currency: string;
  invoiceNumber: string;
  organizationId: string;
  description: string;
  customerRef: string | null;
  methodRef: string;
}

export interface ChargeSavedCardResult {
  /** Référence du paiement, stockée sur `Payment.providerRef`. */
  ref: string;
  /** `processing` : le résultat arrivera par webhook. */
  status: "succeeded" | "processing" | "failed";
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Vérifie la signature et interprète un évènement de webhook. `null` si invalide. */
  parseWebhook(rawBody: string, signature: string | undefined): WebhookOutcome | null;
  /** Rembourse un paiement (émission d'un avoir). Optionnel. */
  refund?(paymentRef: string, amountCents: number): Promise<void>;
  /** Ouvre une session d'enregistrement de carte. Absent = pas de prélèvement automatique. */
  startCardSetup?(input: StartCardSetupInput): Promise<StartCardSetupResult>;
  /** Lit la carte enregistrée par une session. `null` si la session n'a pas (encore) abouti. */
  completeCardSetup?(setupRef: string): Promise<SavedCardDetails | null>;
  /** Prélève une carte enregistrée, sans le client (paiement « hors session »). */
  chargeSavedCard?(input: ChargeSavedCardInput): Promise<ChargeSavedCardResult>;
  /** Détache une carte chez le fournisseur (retrait par le client). */
  detachCard?(methodRef: string): Promise<void>;
}
