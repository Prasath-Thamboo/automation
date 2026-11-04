"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Liens de navigation principale. La page courante est marquée visuellement
 * (fond vert) ET pour les lecteurs d'écran (`aria-current`) : on sait toujours
 * où l'on est.
 */
export function NavLinks({ links }: { links: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-wrap items-center gap-0.5 sm:gap-2">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-touch items-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold no-underline transition-colors sm:px-4 sm:text-base ${
                active
                  ? "bg-primary-100 text-primary-800"
                  : "text-ink-700 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
