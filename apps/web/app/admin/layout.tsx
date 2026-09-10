import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Back-office : vocabulaire technique normal (§2). Non indexé.
export const metadata = { title: "Back-office", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();

  return (
    <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink-100 pb-4">
        <Link href="/admin" className="font-heading text-lg font-bold text-ink-900 no-underline">
          Tando · back-office
        </Link>
        {(
          [
            ["/admin", "Tableau de bord"],
            ["/admin/missions", "Missions"],
            ["/admin/devis", "Devis"],
            ["/admin/metiers", "Métiers"],
            ["/admin/prix", "Prix"],
            ["/admin/clients", "Clients"],
            ["/admin/factures", "Factures"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="text-base text-ink-700 no-underline hover:text-primary-700"
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-ink-500">{user.email}</span>
      </div>
      <div className="py-8">{children}</div>
    </div>
  );
}
