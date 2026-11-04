import Link from "next/link";
import { common } from "@tando/copy";

/**
 * Logotype : le nom en toutes lettres, dans la police de titre (§1 — « un
 * logotype simple en texte »). L'icône carrée dérivée du « T » vit dans
 * app/icon.svg.
 */
export function Logo({ className = "", invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-touch items-center gap-2.5 font-heading text-2xl font-bold tracking-tight no-underline ${invert ? "text-white" : "text-ink-900"} ${className}`}
    >
      <span
        aria-hidden
        className="grid h-10 w-10 place-items-center rounded-md bg-gradient-to-br from-primary-500 to-primary-700 font-heading text-xl font-bold text-white shadow-glow"
      >
        T
      </span>
      {common.appName}
    </Link>
  );
}
