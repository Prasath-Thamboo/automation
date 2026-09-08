import Link from "next/link";
import { nav } from "@tando/copy";
import { Logo } from "./logo";

const links = [
  { href: "/employes-virtuels", label: nav.catalogue },
  { href: "/tarifs", label: nav.pricing },
  { href: "/faq", label: nav.faq },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Logo />
        <nav
          aria-label="Navigation principale"
          className="order-3 flex w-full gap-x-5 gap-y-2 text-base sm:order-2 sm:w-auto sm:flex-1"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-1 text-ink-700 no-underline hover:text-primary-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/connexion"
          className="order-2 ml-auto inline-flex min-h-touch items-center rounded-md border border-primary-600 px-4 py-2 text-base font-semibold text-primary-700 no-underline hover:bg-primary-50 sm:order-3"
        >
          {nav.account}
        </Link>
      </div>
    </header>
  );
}
