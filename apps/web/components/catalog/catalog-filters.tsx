import Link from "next/link";
import type { ReactNode } from "react";

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
      className={`inline-flex min-h-touch items-center rounded-full border px-4 py-1.5 text-sm no-underline ${
        selected
          ? "border-primary-600 bg-primary-600 text-white"
          : "border-ink-100 bg-white text-ink-700 hover:border-primary-600"
      }`}
    >
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
      <p className="text-sm font-semibold text-ink-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
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
    <div className="flex flex-col gap-5">
      <FilterGroup title="Par secteur" param="secteur" options={sectors} current={current} />
      <FilterGroup title="Par besoin" param="besoin" options={needs} current={current} />
    </div>
  );
}
