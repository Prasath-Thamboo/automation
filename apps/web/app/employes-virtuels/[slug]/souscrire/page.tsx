import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { anonApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { SubscribeButton } from "./subscribe-button";

export const metadata: Metadata = { title: "Souscrire", robots: { index: false } };
export const dynamic = "force-dynamic";

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export default async function SouscrirePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/connexion?suite=${encodeURIComponent(`/employes-virtuels/${slug}/souscrire`)}`);
  }

  let profession;
  try {
    profession = await anonApi().catalog.detail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return (
    <section className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      <Link href={`/employes-virtuels/${slug}`} className="text-sm text-primary-700">
        ← Revenir à la fiche
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">
        Mettre {profession.content.assistantName} au travail
      </h1>
      <p className="mt-4 text-lg text-ink-700">{profession.content.intro}</p>

      <div className="mt-6 rounded-lg border border-ink-100 bg-white p-5">
        <p className="text-lg text-ink-900">
          <span className="font-heading text-2xl font-bold">{euro(profession.monthlyPriceEur)}</span>
          <span className="text-ink-500"> / mois, TTC · sans engagement</span>
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {profession.trialDays} jours d&apos;essai. Vous n&apos;êtes pas prélevé avant.
        </p>
        <ul className="mt-3 space-y-1">
          {profession.content.contract.included.map((c, i) => (
            <li key={i} className="flex gap-2 text-base text-ink-700">
              <span aria-hidden className="font-bold text-primary-600">
                ✓
              </span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-sm text-ink-500">
        Après votre accord, vous réglerez sa mise en service en 4 écrans (environ 5 minutes), puis
        il prendra son poste.
      </p>

      <div className="mt-6">
        <SubscribeButton slug={slug} name={profession.content.assistantName} />
      </div>
    </section>
  );
}
