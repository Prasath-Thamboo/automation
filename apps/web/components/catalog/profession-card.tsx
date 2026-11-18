import Link from "next/link";
import type { ProfessionCard as Card } from "@velekya/api-client";
import { ArrowRight } from "@/components/icons";

export function ProfessionCard({ profession }: { profession: Card }) {
  return (
    <Link
      href={`/employes-virtuels/${profession.slug}`}
      className="card-link group flex h-full flex-col"
    >
      <span className="self-start rounded-full bg-accent-50 px-3 py-0.5 text-sm font-bold text-accent-700">
        {profession.sector}
      </span>
      <h2 className="mt-4 text-2xl text-ink-900">{profession.name}</h2>
      {profession.assistantName ? (
        <p className="mt-1 text-base font-semibold text-primary-700">Avec {profession.assistantName}</p>
      ) : null}
      <p className="mt-3 flex-1 text-base text-ink-700">{profession.benefit}</p>
      <div className="mt-6 flex items-end justify-between gap-3 border-t border-ink-100 pt-5">
        <p className="text-base text-ink-700">
          À partir de
          <br />
          <span className="font-heading text-2xl font-bold text-ink-950">
            {profession.monthlyPriceEur} €
          </span>
          <span className="text-ink-500">/mois</span>
        </p>
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-600 text-white transition-transform duration-200 group-hover:translate-x-1"
        >
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
