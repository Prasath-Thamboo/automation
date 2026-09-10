import Link from "next/link";
import { sessionApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

const QUOTE_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  en_relecture: "À relire",
  envoye: "Envoyé",
  vu: "Vu",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};
const MISSION_LABEL: Record<string, string> = {
  a_preparer: "À préparer",
  en_preparation: "En préparation",
  en_service: "En service",
  annulee: "Annulée",
};
const ASSISTANT_LABEL: Record<string, string> = {
  en_formation: "En formation",
  au_travail: "Au travail",
  en_pause: "En pause",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-ink-900">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-ink-500">{hint}</div> : null}
    </div>
  );
}

function Breakdown({
  title,
  items,
  labels,
}: {
  title: string;
  items: Record<string, number>;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <div className="text-sm font-semibold text-ink-700">{title}</div>
      <dl className="mt-2 space-y-1 text-sm">
        {entries.length === 0 ? <p className="text-ink-500">Aucun.</p> : null}
        {entries.map(([key, n]) => (
          <div key={key} className="flex justify-between">
            <dt className="text-ink-600">{labels[key] ?? key}</dt>
            <dd className="font-semibold text-ink-900">{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const d = await (await sessionApi()).admin.dashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Tableau de bord</h1>
        <p className="mt-1 text-base text-ink-500">Activité de la plateforme, en un coup d&apos;œil.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenu mensuel récurrent"
          value={euro(d.revenue.mrrEur)}
          hint={`${d.revenue.activeSubscriptions} abonnement(s) actif(s)`}
        />
        <Stat
          label="Clients"
          value={String(d.clients.total)}
          hint={`${d.clients.withActiveSubscription} avec abonnement · +${d.clients.newLast30d} sur 30 j`}
        />
        <Stat
          label="Taux d'acceptation des devis"
          value={`${d.quotes.acceptanceRatePct} %`}
          hint={`${d.quotes.acceptedLast30d}/${d.quotes.createdLast30d} sur 30 j (accepté/créé)`}
        />
        <Stat
          label="Factures impayées"
          value={String(d.revenue.unpaidInvoices)}
          hint={euro(d.revenue.unpaidEur)}
        />
        <Stat label="Escalades ouvertes" value={String(d.openEscalations)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Breakdown title="Devis par statut" items={d.quotes.byStatus} labels={QUOTE_LABEL} />
        <Breakdown title="Missions par statut" items={d.missions.byStatus} labels={MISSION_LABEL} />
        <Breakdown
          title="Employés virtuels par état"
          items={d.assistants.byState}
          labels={ASSISTANT_LABEL}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/admin/missions" className="font-semibold text-primary-700 no-underline">
          Voir les missions →
        </Link>
        <Link href="/admin/clients" className="font-semibold text-primary-700 no-underline">
          Voir les clients →
        </Link>
        <Link href="/admin/prix" className="font-semibold text-primary-700 no-underline">
          Ajuster le barème →
        </Link>
      </div>
    </div>
  );
}
