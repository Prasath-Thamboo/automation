import Link from "next/link";
import { footer, common, glossary, site } from "@velekya/copy";

const year = new Date().getFullYear();
const columns = [footer.columns.product, footer.columns.legal];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-primary-900 text-primary-100">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          {/* Une des trois seules occurrences autorisées du nom (§8). */}
          <p className="font-heading text-2xl font-bold text-white">{common.appName}</p>
          <p className="mt-2 max-w-xs text-lg text-primary-100">{footer.baseline}</p>
          <Link
            href="/contact"
            className="mt-6 inline-flex min-h-[52px] items-center rounded-full bg-white px-6 text-base font-bold text-primary-800 no-underline transition-colors hover:bg-primary-50"
          >
            {glossary.actions.talkToHuman}
          </Link>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-lg font-bold text-white">{col.title}</p>
            <ul className="mt-4 space-y-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-touch items-center text-base text-primary-100 underline-offset-4 hover:text-white hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-content px-4 py-6 text-sm text-primary-200 sm:px-6 lg:px-8">
          © {year} {site.name}. {footer.rights}
        </p>
      </div>
    </footer>
  );
}
