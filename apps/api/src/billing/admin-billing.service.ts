import { Injectable } from "@nestjs/common";
import type {
  AdminInvoiceList,
  AdminInvoiceListItem,
  CreditNoteDoc,
  InvoiceKind,
  InvoiceStatus,
  IssueCreditNote,
} from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "./billing.service";

type ExportFormat = "csv" | "fec";

const eur = (cents: number) => (Math.round(cents) / 100).toFixed(2);
const frDate = (d: Date) => d.toISOString().slice(0, 10);
const fecDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async list(): Promise<AdminInvoiceList> {
    const rows = await this.prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: {
        creditNotes: { select: { totalCents: true } },
      },
    });
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(orgs.map((o) => [o.id, o.name]));

    const invoices: AdminInvoiceListItem[] = rows.map((r) => ({
      id: r.id,
      number: r.number,
      kind: r.kind as InvoiceKind,
      status: r.status as InvoiceStatus,
      company: nameOf.get(r.organizationId) ?? "—",
      issuedAt: r.issuedAt.toISOString(),
      totalEur: r.totalCents / 100,
      creditedEur: r.creditNotes.reduce((s, c) => s + c.totalCents, 0) / 100,
    }));
    return { invoices };
  }

  creditNote(invoiceId: string, dto: IssueCreditNote, actorUserId: string): Promise<CreditNoteDoc> {
    return this.billing.issueCreditNote(invoiceId, dto.reason, dto.amountEur, actorUserId);
  }

  /** Export comptable CSV ou FEC (§4.3), sur une période. */
  async export(from: Date, to: Date, format: ExportFormat): Promise<{ filename: string; body: string }> {
    const where = { issuedAt: { gte: from, lte: to } };
    const [invoices, creditNotes] = await Promise.all([
      this.prisma.invoice.findMany({ where, orderBy: { issuedAt: "asc" } }),
      this.prisma.creditNote.findMany({
        where,
        orderBy: { issuedAt: "asc" },
        include: { invoice: { select: { number: true } } },
      }),
    ]);
    const period = `${fecDate(from)}-${fecDate(to)}`;

    if (format === "csv") {
      const header = "Date;Type;Numéro;PièceLiée;HT;TVA;TTC;Statut";
      const rows = [
        ...invoices.map((i) =>
          [
            frDate(i.issuedAt),
            "Facture",
            i.number,
            "",
            eur(i.subtotalCents),
            eur(i.vatCents),
            eur(i.totalCents),
            i.status,
          ].join(";"),
        ),
        ...creditNotes.map((c) =>
          [
            frDate(c.issuedAt),
            "Avoir",
            c.number,
            c.invoice.number,
            `-${eur(c.subtotalCents)}`,
            `-${eur(c.vatCents)}`,
            `-${eur(c.totalCents)}`,
            "emis",
          ].join(";"),
        ),
      ];
      return { filename: `export-comptable-${period}.csv`, body: [header, ...rows].join("\r\n") };
    }

    // FEC (Fichier des Écritures Comptables), tabulé, une écriture équilibrée par pièce.
    const cols = [
      "JournalCode",
      "JournalLib",
      "EcritureNum",
      "EcritureDate",
      "CompteNum",
      "CompteLib",
      "PieceRef",
      "PieceDate",
      "EcritureLib",
      "Debit",
      "Credit",
      "EcritureLet",
      "DateLet",
      "ValidDate",
      "Montantdevise",
      "Idevise",
    ];
    const lines: string[] = [cols.join("\t")];
    const entry = (
      journal: string,
      journalLib: string,
      num: string,
      date: Date,
      account: string,
      accountLib: string,
      piece: string,
      label: string,
      debit: string,
      credit: string,
    ) =>
      lines.push(
        [
          journal,
          journalLib,
          num,
          fecDate(date),
          account,
          accountLib,
          piece,
          fecDate(date),
          label,
          debit,
          credit,
          "",
          "",
          fecDate(date),
          "",
          "",
        ].join("\t"),
      );

    for (const i of invoices) {
      const label = `Facture ${i.number}`;
      entry("VT", "Ventes", i.number, i.issuedAt, "411000", "Clients", i.number, label, eur(i.totalCents), "0,00");
      entry("VT", "Ventes", i.number, i.issuedAt, "706000", "Prestations de services", i.number, label, "0,00", eur(i.subtotalCents));
      entry("VT", "Ventes", i.number, i.issuedAt, "445710", "TVA collectée", i.number, label, "0,00", eur(i.vatCents));
    }
    for (const c of creditNotes) {
      const label = `Avoir ${c.number} sur ${c.invoice.number}`;
      entry("VT", "Ventes", c.number, c.issuedAt, "706000", "Prestations de services", c.number, label, eur(c.subtotalCents), "0,00");
      entry("VT", "Ventes", c.number, c.issuedAt, "445710", "TVA collectée", c.number, label, eur(c.vatCents), "0,00");
      entry("VT", "Ventes", c.number, c.issuedAt, "411000", "Clients", c.number, label, "0,00", eur(c.totalCents));
    }

    return { filename: `FEC-${period}.txt`, body: lines.join("\r\n") };
  }
}
