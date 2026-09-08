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
      <div className="flex items-center justify-between border-b border-ink-100 pb-4">
        <Link href="/admin/metiers" className="font-heading text-lg font-bold text-ink-900 no-underline">
          Tando · back-office
        </Link>
        <span className="text-sm text-ink-500">{user.email}</span>
      </div>
      <div className="py-8">{children}</div>
    </div>
  );
}
