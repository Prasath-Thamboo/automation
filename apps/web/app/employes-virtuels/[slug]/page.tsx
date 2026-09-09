import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { offersCopy } from "@tando/copy";
import { anonApi } from "@/lib/api";
import { Cta } from "@/components/cta";
import { DemoConversation } from "@/components/catalog/demo-conversation";
import { SavingsCalculator } from "@/components/catalog/savings-calculator";

type Params = { slug: string };

async function getProfession(slug: string) {
  try {
    return await anonApi().catalog.detail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const { professions } = await anonApi().catalog.list();
    return professions.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfession(slug);
  if (!p) return { title: "Fiche introuvable" };
  return {
    title: `${p.name} — ${p.content.assistantName}, votre assistant`,
    description: p.benefit,
    alternates: { canonical: `/employes-virtuels/${slug}` },
  };
}

const sectionTitle = "mt-14 text-2xl font-bold text-ink-900 first:mt-0";

export default async function ProfessionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProfession(slug);
  if (!p) notFound();

  const { content } = p;

  return (
    <article className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      {/* 1. Présentation */}
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-500">{p.sector}</p>
      <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
        Voici {content.assistantName}, {content.assistantRole}
      </h1>
      <p className="mt-4 text-lg text-ink-700">{content.intro}</p>

      {/* 2. Sa journée type */}
      <h2 className={sectionTitle}>Sa journée type</h2>
      <ol className="mt-5 space-y-4 border-l-2 border-primary-100 pl-5">
        {content.dayTimeline.map((m, i) => (
          <li key={i}>
            <span className="font-heading font-bold text-primary-700">{m.time}</span>
            <p className="mt-1 text-base text-ink-700">{m.text}</p>
          </li>
        ))}
      </ol>

      {/* 3. Ce qu'il sait faire */}
      <h2 className={sectionTitle}>Ce qu&apos;{content.assistantName} sait faire</h2>
      <ul className="mt-5 space-y-2">
        {content.canDo.map((c, i) => (
          <li key={i} className="flex gap-3 text-base text-ink-700">
            <span aria-hidden className="font-bold text-primary-600">
              ✓
            </span>
            {c}
          </li>
        ))}
      </ul>

      {/* 4. Ce qu'il ne fait pas */}
      <h2 className={sectionTitle}>Ce qu&apos;{content.assistantName} ne fait pas</h2>
      <ul className="mt-5 space-y-2">
        {content.cannotDo.map((c, i) => (
          <li key={i} className="flex gap-3 text-base text-ink-700">
            <span aria-hidden className="font-bold text-ink-500">
              —
            </span>
            {c}
          </li>
        ))}
      </ul>

      {/* 5. Démonstration */}
      <h2 className={sectionTitle}>Une conversation, en vrai</h2>
      <div className="mt-5">
        <DemoConversation demo={content.demo} assistantName={content.assistantName} />
      </div>

      {/* 6. Ce qu'il vous fait gagner */}
      <h2 className={sectionTitle}>Ce qu&apos;{content.assistantName} vous fait gagner</h2>
      <div className="mt-5">
        <SavingsCalculator savings={content.savings} />
      </div>

      {/* 7. Son contrat */}
      <h2 className={sectionTitle}>Son contrat</h2>
      <p className="mt-5 text-lg text-ink-900">
        <span className="font-heading text-3xl font-bold">{p.monthlyPriceEur} €</span>
        <span className="text-ink-500">/mois, TTC</span>
        {p.setupPriceEur > 0 ? (
          <span className="text-ink-500"> · mise en service {p.setupPriceEur} €</span>
        ) : (
          <span className="text-ink-500"> · mise en service offerte</span>
        )}
      </p>
      <ul className="mt-4 space-y-2">
        {content.contract.included.map((c, i) => (
          <li key={i} className="flex gap-3 text-base text-ink-700">
            <span aria-hidden className="font-bold text-primary-600">
              ✓
            </span>
            {c}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-base text-ink-700">{content.contract.cancellation}</p>
      <p className="mt-2 text-sm text-ink-500">
        <Link href="/tarifs" className="font-semibold text-primary-700">
          Comparer avec le sur-mesure
        </Link>{" "}
        — {offersCopy.subtitle.toLowerCase()}
      </p>

      {/* 8. Appels à l'action */}
      <div className="mt-14 flex flex-col gap-3 sm:flex-row">
        <Cta href={`/employes-virtuels/${slug}/souscrire`}>
          Mettre {content.assistantName} au travail
        </Cta>
        <Cta href="/questionnaire" variant="secondary">
          Je veux quelque chose de plus précis
        </Cta>
      </div>
    </article>
  );
}
