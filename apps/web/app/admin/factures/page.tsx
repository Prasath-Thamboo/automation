import Link from "next/link";
import { sessionApi } from "@/lib/api";
import { CreditNoteForm } from "./credit-note-form";

export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const KIND: Record<string, string> = { mise_en_service: "Mise en service", abonnement: "Abonnement" };
const STATUS: Record<string, string> = {
  emise: "Émise",
  payee: "Payée",
  impayee: "Impayée",
  annulee: "Annulée (avoir)",
};

export default async function AdminFacturesPage() {
  const { invoices } = await (await sessionApi()).admin.billing.invoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Factures</h1>
          <p className="mt-1 text-base text-ink-500">
            {invoices.length} factures. Une facture n&apos;est jamais modifiée : on émet un avoir.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/factures/export?format=csv"
            className="rounded-md border border-primary-600 px-3 py-2 font-semibold text-primary-700 no-underline"
          >
            Export CSV
          </Link>
          <Link
            href="/admin/factures/export?format=fec"
            className="rounded-md border border-primary-600 px-3 py-2 font-semibold text-primary-700 no-underline"
          >
            Export FEC
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-500">
              <th className="border-b border-ink-100 py-2 pr-4">Numéro</th>
              <th className="border-b border-ink-100 py-2 pr-4">Client</th>
              <th className="border-b border-ink-100 py-2 pr-4">Type</th>
              <th className="border-b border-ink-100 py-2 pr-4">Émise</th>
              <th className="border-b border-ink-100 py-2 pr-4 text-right">TTC</th>
              <th className="border-b border-ink-100 py-2 pr-4">Statut</th>
              <th className="border-b border-ink-100 py-2 pr-4">Avoir</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="border-b border-ink-100 py-2 pr-4 font-semibold">{inv.number}</td>
                <td className="border-b border-ink-100 py-2 pr-4">{inv.company}</td>
                <td className="border-b border-ink-100 py-2 pr-4">{KIND[inv.kind] ?? inv.kind}</td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {new Date(inv.issuedAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="border-b border-ink-100 py-2 pr-4 text-right">
                  {euro(inv.totalEur)}
                  {inv.creditedEur > 0 ? (
                    <span className="block text-xs text-ink-500">−{euro(inv.creditedEur)} avoir</span>
                  ) : null}
                </td>
                <td className="border-b border-ink-100 py-2 pr-4">{STATUS[inv.status] ?? inv.status}</td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {inv.status === "annulee" ? (
                    <span className="text-xs text-ink-500">totalement crédité</span>
                  ) : (
                    <CreditNoteForm invoiceId={inv.id} />
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-ink-500">
                  Aucune facture.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
