import Link from "next/link";
import { sessionApi } from "@/lib/api";
import { NewProfessionForm } from "./new-profession-form";

export const dynamic = "force-dynamic";

function statusLabel(p: { published: boolean; publishedVersion: number | null; hasDraft: boolean }) {
  if (p.published && p.publishedVersion) {
    return p.hasDraft ? `Publié (v${p.publishedVersion}) · brouillon en attente` : `Publié (v${p.publishedVersion})`;
  }
  if (p.publishedVersion) return `Masqué (v${p.publishedVersion} publiée)`;
  return p.hasDraft ? "Brouillon" : "Vide";
}

export default async function AdminMetiersPage() {
  const { professions } = await (await sessionApi()).admin.catalog.list();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Métiers du catalogue</h1>
        <p className="mt-1 text-base text-ink-500">
          {professions.length} métier(s). Créer, éditer et publier une fiche sans redéploiement.
        </p>
      </div>

      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
        {professions.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <Link
                href={`/admin/metiers/${p.id}`}
                className="text-base font-semibold text-ink-900 no-underline hover:text-primary-700"
              >
                {p.name}
              </Link>
              <span className="ml-2 text-sm text-ink-500">/{p.slug} · {p.sector}</span>
            </div>
            <span className="text-sm text-ink-700">{statusLabel(p)}</span>
          </li>
        ))}
        {professions.length === 0 ? (
          <li className="p-4 text-base text-ink-500">Aucun métier pour l&apos;instant.</li>
        ) : null}
      </ul>

      <div>
        <h2 className="text-lg font-bold text-ink-900">Nouveau métier</h2>
        <div className="mt-3">
          <NewProfessionForm />
        </div>
      </div>
    </div>
  );
}
