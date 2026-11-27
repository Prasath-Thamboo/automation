import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "@/components/icons";

type Params = { secteur?: string; besoin?: string };

/**
 * Filtres du catalogue par secteur et par besoin (§5.1). Sans JavaScript : chaque
 * filtre est un lien qui met à jour l'URL (`?secteur=`, `?besoin=`) en conservant
 * l'autre filtre ; la page est rendue côté serveur.
 */
function hrefFor(current: Params, param: keyof Params, value?: string): string {
  const next: Params = { ...current };
  if (value) next[param] = value;
  else delete next[param];
  const sp = new URLSearchParams();
  if (next.secteur) sp.set("secteur", next.secteur);
  if (next.besoin) sp.set("besoin", next.besoin);
  const qs = sp.toString();
  return qs ? `/employes-virtuels?${qs}` : "/employes-virtuels";
}

function FilterChip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={`inline-flex min-h-touch items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-base font-semibold no-underline transition-colors ${
        selected
          ? "border-primary-900 bg-primary-900 text-white shadow-soft"
          : "border-ink-200 bg-white text-ink-700 hover:border-primary-900 hover:text-primary-700"
      }`}
    >
      {selected ? <Check className="h-4 w-4" /> : null}
      {children}
    </Link>
  );
}

function FilterGroup({
  title,
  param,
  options,
  current,
}: {
  title: string;
  param: keyof Params;
  options: string[];
  current: Params;
}) {
  const active = current[param];
  return (
    <div>
      <p className="text-lg font-bold text-ink-900">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip href={hrefFor(current, param)} selected={!active}>
          Tous
        </FilterChip>
        {options.map((opt) => (
          <FilterChip key={opt} href={hrefFor(current, param, opt)} selected={active === opt}>
            {opt}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

export function CatalogFilters({
  sectors,
  needs,
  current,
}: {
  sectors: string[];
  needs: string[];
  current: Params;
}) {
  return (
    <div className="card flex flex-col gap-7 lg:sticky lg:top-28">
      <FilterGroup title="Par secteur" param="secteur" options={sectors} current={current} />
      <FilterGroup title="Par besoin" param="besoin" options={needs} current={current} />
    </div>
  );
}
