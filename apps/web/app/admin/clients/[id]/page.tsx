import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

const SUB_LABEL: Record<string, string> = {
  incomplete: "En ouverture",
  active: "Actif",
  past_due: "Impayé",
  paused: "En pause",
  canceled: "Résilié",
};
const ASSISTANT_LABEL: Record<string, string> = {
  en_formation: "En formation",
  au_travail: "Au travail",
  en_pause: "En pause",
};

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let client;
  try {
    client = await (await sessionApi()).admin.clients.get(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const sub = client.subscription;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clients" className="text-sm text-primary-700 no-underline">
          ← Clients
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">{client.name}</h1>
        <p className="mt-1 text-base text-ink-500">
          {client.slug} · client depuis le {new Date(client.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Contrat</h2>
        {sub ? (
          <div className="rounded-lg border border-ink-100 p-4 text-sm text-ink-700">
            <p>
              <span className="font-semibold">{SUB_LABEL[sub.status] ?? sub.status}</span> — formule{" "}
              {sub.formula}
            </p>
            <p>
              {euro(sub.monthlyEur)} / mois · mise en service {euro(sub.setupEur)}
            </p>
            {sub.currentPeriodEnd ? (
              <p>Prochaine échéance : {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}</p>
            ) : null}
            {sub.canceledAt ? (
              <p>Résilié le {new Date(sub.canceledAt).toLocaleDateString("fr-FR")}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-ink-500">Aucun contrat.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Équipe ({client.members.length})</h2>
        <ul className="text-sm text-ink-700">
          {client.members.map((m) => (
            <li key={m.email}>
              {m.fullName ?? m.email} — {m.role} <span className="text-ink-500">({m.email})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">
          Employés virtuels ({client.assistants.length})
        </h2>
        <ul className="text-sm text-ink-700">
          {client.assistants.map((a) => (
            <li key={a.id}>
              {a.name} — {a.role} · {ASSISTANT_LABEL[a.state] ?? a.state}
              {a.onboarding !== "termine" ? " · mise en service en cours" : ""}
            </li>
          ))}
          {client.assistants.length === 0 ? <li className="text-ink-500">Aucun.</li> : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Dernières factures</h2>
        <ul className="text-sm text-ink-700">
          {client.recentInvoices.map((i) => (
            <li key={i.number}>
              {new Date(i.issuedAt).toLocaleDateString("fr-FR")} · {i.number} · {euro(i.totalEur)} ·{" "}
              {i.status}
            </li>
          ))}
          {client.recentInvoices.length === 0 ? <li className="text-ink-500">Aucune.</li> : null}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Dernières escalades</h2>
        <ul className="text-sm text-ink-700">
          {client.recentEscalations.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleDateString("fr-FR")} · {e.status} — {e.question}
            </li>
          ))}
          {client.recentEscalations.length === 0 ? <li className="text-ink-500">Aucune.</li> : null}
        </ul>
      </section>
    </div>
  );
}
