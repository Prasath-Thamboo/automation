import Link from "next/link";
import { common } from "@tando/copy";

/**
 * Logotype : le nom en toutes lettres, dans la police de titre (§1 — « un
 * logotype simple en texte »). L'icône carrée dérivée du « T » vit dans
 * app/icon.svg.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-primary-700 no-underline ${className}`}
    >
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-md bg-primary-600 font-heading text-lg font-bold text-white"
      >
        T
      </span>
      {common.appName}
    </Link>
  );
}
