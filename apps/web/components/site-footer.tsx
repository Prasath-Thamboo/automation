import Link from "next/link";
import { footer, common, glossary, site } from "@tando/copy";

const year = new Date().getFullYear();
const columns = [footer.columns.product, footer.columns.legal];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          {/* Une des trois seules occurrences autorisées du nom (§8). */}
          <p className="font-heading text-lg font-bold text-primary-700">{common.appName}</p>
          <p className="mt-1 max-w-xs text-base text-ink-500">{footer.baseline}</p>
          <Link
            href="/contact"
            className="mt-4 inline-flex min-h-touch items-center rounded-md border border-primary-600 px-4 py-2 text-base font-semibold text-primary-700 no-underline hover:bg-primary-50"
          >
            {glossary.actions.talkToHuman}
          </Link>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-base font-semibold text-ink-900">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-base text-ink-700 no-underline hover:text-primary-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-100">
        <p className="mx-auto max-w-content px-4 py-6 text-sm text-ink-500 sm:px-6">
          © {year} {site.name}. {footer.rights}
        </p>
      </div>
    </footer>
  );
}
