import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Callout } from "@tando/ui";
import { dashboard, glossary } from "@tando/copy";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: dashboard.title };

/**
 * Espace client — coquille protégée. « Mon équipe » sera remplie au Lot 5
 * (carnet de bord, escalades, formation de l'assistant…).
 */
export default async function MonEquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  return (
    <section className="mx-auto flex max-w-content flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink-900">{dashboard.title}</h1>
        <SignOutButton />
      </div>

      <p className="text-base text-ink-700">
        Bonjour {user.fullName ?? user.email} — {user.organizationName}.
      </p>

      <Callout title={dashboard.empty.title}>{dashboard.empty.body}</Callout>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/mon-equipe/documents"
          className="inline-flex min-h-touch items-center rounded-md border border-primary-600 px-4 py-2 text-base font-semibold text-primary-700 no-underline hover:bg-primary-50"
        >
          Mes documents
        </Link>
        <Link
          href="/employes-virtuels"
          className="inline-flex min-h-touch items-center rounded-md border border-ink-100 px-4 py-2 text-base font-semibold text-ink-700 no-underline hover:border-primary-600"
        >
          {dashboard.empty.cta}
        </Link>
      </div>

      <p className="text-sm text-ink-500">
        {glossary.assistant.plural} apparaîtront ici dès qu&apos;ils auront pris leur poste.
      </p>
    </section>
  );
}
