import Link from "next/link";
import { nav } from "@tando/copy";
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
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Logo />
        <nav
          aria-label="Navigation principale"
          className="order-3 -mx-2 w-full sm:order-2 sm:mx-0 sm:w-auto sm:flex-1"
        >
          <NavLinks links={links} />
        </nav>
        <Link
          href="/connexion"
          className="order-2 ml-auto inline-flex min-h-touch items-center rounded-full bg-ink-900 px-5 text-base font-bold text-white no-underline transition-colors hover:bg-primary-800 sm:order-3"
        >
          {nav.account}
        </Link>
      </div>
    </header>
  );
}
