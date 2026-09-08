import Link from "next/link";
import type { ProfessionCard as Card } from "@tando/api-client";

export function ProfessionCard({ profession }: { profession: Card }) {
  return (
    <Link
      href={`/employes-virtuels/${profession.slug}`}
      className="flex flex-col rounded-lg border border-ink-100 bg-white p-6 no-underline transition-colors hover:border-primary-600"
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-ink-500">
        {profession.sector}
      </span>
      <h2 className="mt-1 text-xl font-bold text-ink-900">{profession.name}</h2>
      {profession.assistantName ? (
        <p className="mt-1 text-base text-primary-700">Avec {profession.assistantName}</p>
      ) : null}
      <p className="mt-3 flex-1 text-base text-ink-700">{profession.benefit}</p>
      <p className="mt-4 text-base text-ink-900">
        À partir de{" "}
        <span className="font-heading text-lg font-bold">{profession.monthlyPriceEur} €</span>
        <span className="text-ink-500">/mois</span>
      </p>
    </Link>
  );
}
