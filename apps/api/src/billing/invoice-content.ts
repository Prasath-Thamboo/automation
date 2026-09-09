import type {
  CreditNoteDoc,
  InvoiceDoc,
  InvoiceKind,
  InvoiceLine,
  InvoiceParty,
  InvoiceStatus,
} from "@tando/types";
import type { CreditNote, Invoice, InvoiceLineItem } from "@prisma/client";
import type { Env } from "../config/env";

export const LEGAL_NOTICE =
  "En cas de retard de paiement, une pénalité égale à trois fois le taux d'intérêt légal est exigible (art. L.441-10 du Code de commerce), ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €. Aucun escompte pour paiement anticipé. TVA acquittée sur les débits.";

const TODO = "[À COMPLÉTER]";

/** Contenu JSON figé, stocké sur `Invoice.content` (inaltérable §9.4). */
export interface FrozenInvoiceContent {
  seller: InvoiceParty;
  buyer: InvoiceParty;
  legalNotice: string;
}

export function freezeInvoiceContent(env: Env, orgName: string): FrozenInvoiceContent {
  return {
    seller: { name: env.SELLER_NAME, address: env.SELLER_ADDRESS, extra: env.SELLER_LEGAL },
    buyer: { name: orgName, address: TODO, extra: "" },
    legalNotice: LEGAL_NOTICE,
  };
}

const eur = (cents: number): number => Math.round(cents) / 100;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Décompose un montant TTC en HT + TVA pour un taux donné (centimes). */
export function splitTtc(totalCents: number, vatRatePct: number): { subtotalCents: number; vatCents: number } {
  const subtotalCents = Math.round(totalCents / (1 + vatRatePct / 100));
  return { subtotalCents, vatCents: totalCents - subtotalCents };
}

type InvoiceRow = Invoice & { lineItems: InvoiceLineItem[] };

export function toInvoiceDoc(row: InvoiceRow): InvoiceDoc {
  const c = row.content as unknown as FrozenInvoiceContent;
  const lines: InvoiceLine[] = row.lineItems
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      label: l.label,
      quantity: l.quantity,
      unitEur: eur(l.unitCents),
      totalEur: eur(l.totalCents),
    }));
  return {
    number: row.number,
    kind: row.kind as InvoiceKind,
    status: row.status as InvoiceStatus,
    issuedAt: row.issuedAt.toISOString(),
    dueAt: iso(row.dueAt),
    periodStart: iso(row.periodStart),
    periodEnd: iso(row.periodEnd),
    currency: row.currency,
    vatRatePct: row.vatRatePct,
    subtotalEur: eur(row.subtotalCents),
    vatEur: eur(row.vatCents),
    totalEur: eur(row.totalCents),
    paidAt: iso(row.paidAt),
    voidedAt: iso(row.voidedAt),
    lines,
    seller: c.seller,
    buyer: c.buyer,
    legalNotice: c.legalNotice,
  };
}

export function toCreditNoteDoc(row: CreditNote & { invoice: Pick<Invoice, "number"> }): CreditNoteDoc {
  return {
    number: row.number,
    invoiceNumber: row.invoice.number,
    reason: row.reason,
    issuedAt: row.issuedAt.toISOString(),
    currency: row.currency,
    vatRatePct: row.vatRatePct,
    subtotalEur: eur(row.subtotalCents),
    vatEur: eur(row.vatCents),
    totalEur: eur(row.totalCents),
  };
}
