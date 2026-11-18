import type { Metadata } from "next";
import Link from "next/link";
import { stub } from "@velekya/copy";
import { anonApi } from "@/lib/api";
import { ProfessionCard } from "@/components/catalog/profession-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { PageHeader } from "@/components/page-header";
import { Cta } from "@/components/cta";

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
      <PageHeader narrow title={stub.catalogue.title} intro={stub.catalogue.body}>
        <Cta href="/questionnaire" arrow className="mt-8">
          Décrire mon besoin
        </Cta>
      </PageHeader>
    );
  }

  const filtered = data.professions.filter(
    (p) => (!secteur || p.sector === secteur) && (!besoin || p.needs.includes(besoin)),
  );

  return (
    <>
      <PageHeader
        title="Un employé déjà formé à votre métier"
        intro="Il connaît vos habitudes, vos questions récurrentes, votre rythme. Choisissez votre métier, personnalisez le minimum, et il est actif."
      />
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
          <aside>
            <CatalogFilters
              sectors={data.sectors}
              needs={data.needs}
              current={{ secteur, besoin }}
            />
          </aside>

          <div>
            {filtered.length === 0 ? (
              <p className="card text-base text-ink-700">
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
    </>
  );
}
