import Link from "next/link";
import { sessionApi } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  brouillon: "Brouillon",
  en_relecture: "À relire",
  envoye: "Envoyé",
  vu: "Vu par le client",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default async function AdminDevisPage() {
  const { quotes } = await (await sessionApi()).admin.quotes.list();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Devis</h1>
        <p className="mt-1 text-base text-ink-500">
          {quotes.length} devis. Relire, ajuster, puis envoyer au client (jamais automatique).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-500">
              <th className="border-b border-ink-100 py-2 pr-4">Numéro</th>
              <th className="border-b border-ink-100 py-2 pr-4">Client</th>
              <th className="border-b border-ink-100 py-2 pr-4">Statut</th>
              <th className="border-b border-ink-100 py-2 pr-4 text-right">Mensuel</th>
              <th className="border-b border-ink-100 py-2 pr-4">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td className="border-b border-ink-100 py-2 pr-4">
                  <Link href={`/admin/devis/${q.id}`} className="font-semibold text-primary-700 no-underline">
                    {q.number}
                  </Link>
                </td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {q.company}
                  <span className="block text-ink-500">{q.email}</span>
                </td>
                <td className="border-b border-ink-100 py-2 pr-4">{STATUS[q.status] ?? q.status}</td>
                <td className="border-b border-ink-100 py-2 pr-4 text-right">{euro(q.monthlyEur)}</td>
                <td className="border-b border-ink-100 py-2 pr-4">
                  {new Date(q.createdAt).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-ink-500">
                  Aucun devis pour l&apos;instant.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
