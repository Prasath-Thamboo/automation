import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { InvoiceDoc } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { PayButton } from "./pay-button";

export const metadata: Metadata = { title: "Mes documents", robots: { index: false } };
export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const frDate = (s: string) => new Date(s).toLocaleDateString("fr-FR");

const KIND: Record<InvoiceDoc["kind"], string> = {
  mise_en_service: "Mise en service",
  abonnement: "Abonnement mensuel",
};
const STATUS: Record<InvoiceDoc["status"], string> = {
  emise: "À payer",
  payee: "Payée",
  impayee: "Impayée",
  annulee: "Annulée par avoir",
};
const SUB_STATUS: Record<string, string> = {
  incomplete: "En attente du premier paiement",
  active: "Actif",
  past_due: "Paiement en retard",
  paused: "En pause",
  canceled: "Résilié",
};

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const { subscription, invoices, creditNotes } = await (await sessionApi()).me.documents();

  return (
    <section className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-ink-900">Mes documents</h1>

      {subscription ? (
        <div className="mt-6 rounded-lg border border-ink-100 bg-white p-5">
          <p className="text-base text-ink-900">
            Contrat : <strong>{SUB_STATUS[subscription.status] ?? subscription.status}</strong>
          </p>
          <p className="mt-1 text-base text-ink-700">
            {euro(subscription.monthlyEur)} / mois
            {subscription.currentPeriodEnd
              ? ` · prochaine échéance le ${frDate(subscription.currentPeriodEnd)}`
              : ""}
          </p>
        </div>
      ) : null}

      <h2 className="mt-10 text-xl font-bold text-ink-900">Factures</h2>
      {invoices.length === 0 ? (
        <p className="mt-3 text-base text-ink-500">Aucune facture pour l&apos;instant.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
          {invoices.map((inv) => (
            <li key={inv.number} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-base font-semibold text-ink-900">
                  {inv.number} · {KIND[inv.kind]}
                </p>
                <p className="text-sm text-ink-500">
                  Émise le {frDate(inv.issuedAt)} · {euro(inv.totalEur)} TTC · {STATUS[inv.status]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/mon-equipe/documents/${inv.number}`}
                  target="_blank"
                  className="text-sm font-semibold text-primary-700"
                >
                  Voir la facture
                </Link>
                {inv.status === "emise" || inv.status === "impayee" ? (
                  <PayButton invoiceNumber={inv.number} amountLabel={euro(inv.totalEur)} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {creditNotes.length > 0 ? (
        <>
          <h2 className="mt-10 text-xl font-bold text-ink-900">Avoirs</h2>
          <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
            {creditNotes.map((cn) => (
              <li key={cn.number} className="p-4">
                <p className="text-base font-semibold text-ink-900">
                  {cn.number} · sur {cn.invoiceNumber}
                </p>
                <p className="text-sm text-ink-500">
                  {frDate(cn.issuedAt)} · {euro(cn.totalEur)} TTC · {cn.reason}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-8">
        <Link href="/mon-equipe" className="text-sm font-semibold text-primary-700">
          ← Mon équipe
        </Link>
      </p>
    </section>
  );
}
