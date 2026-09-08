import type { Metadata } from "next";
import Link from "next/link";
import { stub } from "@tando/copy";
import { anonApi } from "@/lib/api";
import { ProfessionCard } from "@/components/catalog/profession-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";

export const metadata: Metadata = {
  title: "Les employés virtuels disponibles",
  description:
    "Un assistant déjà formé à votre métier : dentiste, restaurateur, garagiste, coiffeur, agent immobilier, artisan. Actif en quelques minutes.",
  alternates: { canonical: "/employes-virtuels" },
};

export default async function EmployesVirtuelsPage({
  searchParams,
}: {
  searchParams: Promise<{ secteur?: string; besoin?: string }>;
}) {
  const { secteur, besoin } = await searchParams;

  let data;
  try {
    data = await anonApi().catalog.list();
  } catch {
    data = null;
  }

  if (!data || data.professions.length === 0) {
    return (
      <div className="mx-auto max-w-prose px-4 py-20 sm:px-6">
        <h1 className="text-3xl font-bold text-ink-900">{stub.catalogue.title}</h1>
        <p className="mt-4 text-lg text-ink-700">{stub.catalogue.body}</p>
        <Link href="/questionnaire" className="mt-6 inline-block font-semibold text-primary-700">
          Décrire mon besoin →
        </Link>
      </div>
    );
  }

  const filtered = data.professions.filter(
    (p) =>
      (!secteur || p.sector === secteur) && (!besoin || p.needs.includes(besoin)),
  );

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">
        Un employé déjà formé à votre métier
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-700">
        Il connaît vos habitudes, vos questions récurrentes, votre rythme. Choisissez votre
        métier, personnalisez le minimum, et il est actif.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside>
          <CatalogFilters
            sectors={data.sectors}
            needs={data.needs}
            current={{ secteur, besoin }}
          />
        </aside>

        <div>
          {filtered.length === 0 ? (
            <p className="text-base text-ink-700">
              Aucun employé ne correspond à ce filtre pour le moment.{" "}
              <Link href="/questionnaire" className="font-semibold text-primary-700">
                Décrivez votre besoin
              </Link>{" "}
              : on peut en construire un pour vous.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {filtered.map((p) => (
                <ProfessionCard key={p.slug} profession={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
