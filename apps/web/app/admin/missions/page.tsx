import Link from "next/link";
import { sessionApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  a_preparer: "À préparer",
  en_preparation: "En préparation",
  en_service: "En service",
  annulee: "Annulée",
};
const ORDER = ["a_preparer", "en_preparation", "en_service", "annulee"];

export default async function AdminMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = ORDER.includes(status ?? "") ? status : undefined;
  const { missions } = await (await sessionApi()).admin.missions.list(filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Missions</h1>
        <p className="mt-1 text-base text-ink-500">
          Mise en service des devis acceptés : préparer la fiche de poste, suivre l&apos;avancement.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/missions"
          className={`rounded-md border px-2.5 py-1 no-underline ${
            filter ? "border-ink-100 text-ink-600" : "border-primary-600 font-semibold text-primary-700"
          }`}
        >
          Toutes
        </Link>
        {ORDER.map((s) => (
          <Link
            key={s}
            href={`/admin/missions?status=${s}`}
            className={`rounded-md border px-2.5 py-1 no-underline ${
              filter === s
                ? "border-primary-600 font-semibold text-primary-700"
                : "border-ink-100 text-ink-600"
            }`}
          >
            {STATUS[s]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-500">
              <th className="border-b border-ink-100 py-2 pr-4">Devis</th>
              <th className="border-b border-ink-100 py-2 pr-4">Client</th>
              <th className="border-b border-ink-100 py-2 pr-4">Employé virtuel</th>
              <th className="border-b border-ink-100 py-2 pr-4">Statut</th>
              <th className="border-b border-ink-100 py-2 pr-4">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <tr key={m.id}>
                <td className="border-b border-ink-100 py-2 pr-4">
                  <Link
                    href={`/admin/missions/${m.id}`}
                    className="font-semibold text-primary-700 no-underline"
                  >
                    {m.quoteNumber}
                  </Link>
                </td>
                <td className="border-b border-ink-100 py-2 pr-4">{m.organizationName}</td>
                <td className="border-b border-ink-100 py-2 pr-4">{m.assistantName ?? "—"}</td>
                <td className="border-b border-ink-100 py-2 pr-4">{STATUS[m.status] ?? m.status}</td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {missions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ink-500">
                  Aucune mission.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
