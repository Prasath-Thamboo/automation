import { z } from "zod";

/**
 * Paiement et facturation (§4.3, §9.4). Notre système est l'autorité sur la
 * numérotation et le contenu des factures (séquentiel, inaltérable) ; le
 * fournisseur de paiement n'est que le rail.
 */

export type SubscriptionStatus =
  | "incomplete"
  | "active"
  | "past_due"
  | "paused"
  | "canceled";

export type InvoiceKind = "mise_en_service" | "abonnement";
export type InvoiceStatus = "emise" | "payee" | "impayee" | "annulee";
export type PaymentStatus = "en_attente" | "reussi" | "echoue" | "rembourse";

export interface InvoiceLine {
  label: string;
  quantity: number;
  unitEur: number;
  totalEur: number;
}

export interface InvoiceParty {
  name: string;
  address: string;
  extra: string;
}

export interface InvoiceDoc {
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  vatRatePct: number;
  subtotalEur: number;
  vatEur: number;
  totalEur: number;
  paidAt: string | null;
  voidedAt: string | null;
  lines: InvoiceLine[];
  seller: InvoiceParty;
  buyer: InvoiceParty;
  legalNotice: string;
}

export interface CreditNoteDoc {
  number: string;
  invoiceNumber: string;
  reason: string;
  issuedAt: string;
  currency: string;
  vatRatePct: number;
  subtotalEur: number;
  vatEur: number;
  totalEur: number;
}

export interface SubscriptionSummary {
  status: SubscriptionStatus;
  formula: string;
  currency: string;
  monthlyEur: number;
  setupEur: number;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export interface DocumentsBundle {
  subscription: SubscriptionSummary | null;
  invoices: InvoiceDoc[];
  creditNotes: CreditNoteDoc[];
}

/**
 * Où et comment gérer son contrat en dehors de l'application mobile (§10, Lot 9).
 * L'abonnement se souscrit et se règle sur le web ; l'app mobile n'encaisse rien
 * et n'affiche aucun lien de paiement cliquable sur iOS — juste `hint`.
 */
export interface BillingManageHandoff {
  /** Adresse de gestion (espace client web). `null` si aucune gestion en ligne. */
  url: string | null;
  /** Phrase affichée telle quelle au client. */
  hint: string;
}

/** Vue « mon contrat » de l'application mobile. */
export interface MobileBillingView {
  subscription: SubscriptionSummary | null;
  manage: BillingManageHandoff;
}

/** Retour du démarrage d'un paiement. */
export interface CheckoutInfo {
  provider: string;
  paymentRef: string;
  invoiceNumber: string;
  amountEur: number;
  /** Présent pour un fournisseur qui redirige (Stripe). Absent en mode `fake`. */
  checkoutUrl: string | null;
}

export interface PaymentOutcome {
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
  subscriptionStatus: SubscriptionStatus;
}

// ── Back-office ────────────────────────────────────────────────────────────

export interface AdminInvoiceListItem {
  id: string;
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  company: string;
  issuedAt: string;
  totalEur: number;
  creditedEur: number;
}

export interface AdminInvoiceList {
  invoices: AdminInvoiceListItem[];
}

// ── Schémas ───────────────────────────────────────────────────────────────

const partySchema: z.ZodType<InvoiceParty> = z.object({
  name: z.string(),
  address: z.string(),
  extra: z.string(),
});

const lineSchema: z.ZodType<InvoiceLine> = z.object({
  label: z.string(),
  quantity: z.number(),
  unitEur: z.number(),
  totalEur: z.number(),
});

const invoiceStatusEnum = z.enum(["emise", "payee", "impayee", "annulee"]);
const invoiceKindEnum = z.enum(["mise_en_service", "abonnement"]);
const subStatusEnum = z.enum(["incomplete", "active", "past_due", "paused", "canceled"]);
const paymentStatusEnum = z.enum(["en_attente", "reussi", "echoue", "rembourse"]);

export const invoiceDocSchema: z.ZodType<InvoiceDoc> = z.object({
  number: z.string(),
  kind: invoiceKindEnum,
  status: invoiceStatusEnum,
  issuedAt: z.string(),
  dueAt: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  currency: z.string(),
  vatRatePct: z.number(),
  subtotalEur: z.number(),
  vatEur: z.number(),
  totalEur: z.number(),
  paidAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  lines: z.array(lineSchema),
  seller: partySchema,
  buyer: partySchema,
  legalNotice: z.string(),
});

export const creditNoteDocSchema: z.ZodType<CreditNoteDoc> = z.object({
  number: z.string(),
  invoiceNumber: z.string(),
  reason: z.string(),
  issuedAt: z.string(),
  currency: z.string(),
  vatRatePct: z.number(),
  subtotalEur: z.number(),
  vatEur: z.number(),
  totalEur: z.number(),
});

export const subscriptionSummarySchema: z.ZodType<SubscriptionSummary> = z.object({
  status: subStatusEnum,
  formula: z.string(),
  currency: z.string(),
  monthlyEur: z.number(),
  setupEur: z.number(),
  currentPeriodEnd: z.string().nullable(),
  canceledAt: z.string().nullable(),
});

export const documentsBundleSchema: z.ZodType<DocumentsBundle> = z.object({
  subscription: subscriptionSummarySchema.nullable(),
  invoices: z.array(invoiceDocSchema),
  creditNotes: z.array(creditNoteDocSchema),
});

export const billingManageHandoffSchema: z.ZodType<BillingManageHandoff> = z.object({
  url: z.string().nullable(),
  hint: z.string(),
});

export const mobileBillingViewSchema: z.ZodType<MobileBillingView> = z.object({
  subscription: subscriptionSummarySchema.nullable(),
  manage: billingManageHandoffSchema,
});

export const checkoutInfoSchema: z.ZodType<CheckoutInfo> = z.object({
  provider: z.string(),
  paymentRef: z.string(),
  invoiceNumber: z.string(),
  amountEur: z.number(),
  checkoutUrl: z.string().nullable(),
});

export const paymentOutcomeSchema: z.ZodType<PaymentOutcome> = z.object({
  paymentStatus: paymentStatusEnum,
  invoiceStatus: invoiceStatusEnum,
  subscriptionStatus: subStatusEnum,
});

export const adminInvoiceListItemSchema: z.ZodType<AdminInvoiceListItem> = z.object({
  id: z.string().uuid(),
  number: z.string(),
  kind: invoiceKindEnum,
  status: invoiceStatusEnum,
  company: z.string(),
  issuedAt: z.string(),
  totalEur: z.number(),
  creditedEur: z.number(),
});

export const adminInvoiceListSchema: z.ZodType<AdminInvoiceList> = z.object({
  invoices: z.array(adminInvoiceListItemSchema),
});

export const issueCreditNoteSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  /** Montant TTC à créditer, en euros. Omis = avoir total. */
  amountEur: z.number().positive().max(1_000_000).optional(),
});
export type IssueCreditNote = z.infer<typeof issueCreditNoteSchema>;

/** Démarrage d'un paiement de facture par le client. */
export const startPaymentSchema = z.object({
  invoiceNumber: z.string().trim().min(3).max(40),
});
export type StartPayment = z.infer<typeof startPaymentSchema>;
