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
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-ink-100 pb-4">
        <span className="font-heading text-lg font-bold text-ink-900">Tando · back-office</span>
        <Link href="/admin/metiers" className="text-base text-ink-700 no-underline hover:text-primary-700">
          Métiers
        </Link>
        <Link href="/admin/devis" className="text-base text-ink-700 no-underline hover:text-primary-700">
          Devis
        </Link>
        <span className="ml-auto text-sm text-ink-500">{user.email}</span>
      </div>
      <div className="py-8">{children}</div>
    </div>
  );
}
