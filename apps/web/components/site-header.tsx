import Link from "next/link";
import { nav } from "@velekya/copy";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

const links = [
  { href: "/employes-virtuels", label: nav.catalogue },
  { href: "/tarifs", label: nav.pricing },
  { href: "/faq", label: nav.faq },
];

/**
 * En-tête : toujours visible, libellés écrits en toutes lettres (pas de menu
 * « hamburger » caché). Sur téléphone, la navigation passe sur une 2e ligne.
 * Barre de navigation bleu nuit (charte §2), logo version fond sombre.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-primary-900 text-white">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Logo invert />
        <nav
          aria-label="Navigation principale"
          className="order-3 -mx-2 w-full sm:order-2 sm:mx-0 sm:w-auto sm:flex-1"
        >
          <NavLinks links={links} />
        </nav>
        <Link
          href="/connexion"
          className="order-2 ml-auto inline-flex min-h-touch items-center rounded-lg bg-accent-600 px-5 text-base font-semibold text-white no-underline transition-colors hover:bg-accent-700 sm:order-3"
        >
          {nav.account}
        </Link>
      </div>
    </header>
  );
}
