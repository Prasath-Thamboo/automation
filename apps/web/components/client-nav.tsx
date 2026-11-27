"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clientNav } from "@velekya/copy";

const tabs = [
  { href: "/mon-equipe", label: clientNav.team },
  { href: "/mon-equipe/documents", label: clientNav.documents },
  { href: "/mon-equipe/compte", label: clientNav.account },
  { href: "/mon-equipe/aide", label: clientNav.help },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/mon-equipe") {
    return (
      pathname === href ||
      (pathname.startsWith("/mon-equipe/") &&
        !pathname.startsWith("/mon-equipe/documents") &&
        !pathname.startsWith("/mon-equipe/compte") &&
        !pathname.startsWith("/mon-equipe/aide"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Onglets de l'espace client : gros, écrits en toutes lettres, la page
 * courante est surlignée et annoncée (`aria-current`).
 */
export function ClientNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={clientNav.label} className="border-b border-ink-100 bg-white">
      <ul className="mx-auto flex max-w-content gap-1 overflow-x-auto px-4 sm:gap-2 sm:px-6 lg:px-8">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[56px] items-center border-b-4 px-3 text-base font-bold no-underline transition-colors sm:px-4 ${
                  active
                    ? "border-primary-900 text-primary-800"
                    : "border-transparent text-ink-700 hover:border-ink-200 hover:text-ink-900"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
