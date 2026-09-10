import Link from "next/link";
import { sessionApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const SUB_LABEL: Record<string, string> = {
  incomplete: "En ouverture",
  active: "Actif",
  past_due: "Impayé",
  paused: "En pause",
  canceled: "Résilié",
};

export default async function AdminClientsPage() {
  const { clients } = await (await sessionApi()).admin.clients.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Clients</h1>
        <p className="mt-1 text-base text-ink-500">{clients.length} organisation(s).</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-500">
              <th className="border-b border-ink-100 py-2 pr-4">Nom</th>
              <th className="border-b border-ink-100 py-2 pr-4">Contrat</th>
              <th className="border-b border-ink-100 py-2 pr-4 text-right">Membres</th>
              <th className="border-b border-ink-100 py-2 pr-4 text-right">Employés virtuels</th>
              <th className="border-b border-ink-100 py-2 pr-4 text-right">Escalades ouvertes</th>
              <th className="border-b border-ink-100 py-2 pr-4">Depuis</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td className="border-b border-ink-100 py-2 pr-4">
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="font-semibold text-primary-700 no-underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {c.subscriptionStatus ? SUB_LABEL[c.subscriptionStatus] ?? c.subscriptionStatus : "—"}
                </td>
                <td className="border-b border-ink-100 py-2 pr-4 text-right">{c.memberCount}</td>
                <td className="border-b border-ink-100 py-2 pr-4 text-right">{c.assistantCount}</td>
                <td className="border-b border-ink-100 py-2 pr-4 text-right">{c.openEscalations}</td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-ink-500">
                  Aucun client pour l&apos;instant.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
