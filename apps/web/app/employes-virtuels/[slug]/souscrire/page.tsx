import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { subscribeCopy } from "@tando/copy";
import { anonApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { Check } from "@/components/icons";
import { SubscribeButton } from "./subscribe-button";

export const metadata: Metadata = { title: "Embaucher", robots: { index: false } };
export const dynamic = "force-dynamic";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

/** Lot 16 — confirmation d'embauche « prêt à l'emploi » (connexion requise). */
export default async function SouscrirePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(`/employes-virtuels/${slug}/souscrire`)}`);

  let profession;
  try {
    profession = await anonApi().catalog.detail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
  const { content } = profession;

  return (
    <section className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-16">
      <Link href={`/employes-virtuels/${slug}`} className="text-base font-semibold text-primary-700">
        {subscribeCopy.back}
      </Link>
      <h1 className="mt-4 text-3xl text-ink-950 sm:text-4xl">{subscribeCopy.title(content.assistantName)}</h1>
      <p className="mt-4 text-lg text-ink-700">{content.intro}</p>

      <div className="card mt-8">
        <p className="text-lg text-ink-900">
          <span className="font-heading text-3xl font-bold">{euro(profession.monthlyPriceEur)}</span>
          <span className="text-ink-600"> {subscribeCopy.perMonth}</span>
        </p>
        <p className="mt-3 rounded-md bg-primary-50 p-4 text-base text-primary-800">
          {subscribeCopy.trial(profession.trialDays)}
        </p>
        <ul className="mt-5 space-y-3">
          {content.contract.included.map((c, i) => (
            <li key={i} className="flex gap-3 text-base text-ink-700">
              <Check className="mt-1 h-5 w-5 shrink-0 text-primary-600" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-base text-ink-700">{subscribeCopy.next}</p>
      <div className="mt-6">
        <SubscribeButton slug={slug} name={content.assistantName} />
      </div>
    </section>
  );
}
