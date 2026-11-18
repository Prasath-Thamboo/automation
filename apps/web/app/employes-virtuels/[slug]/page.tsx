import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { offersCopy, subscribeCopy } from "@velekya/copy";
import { anonApi } from "@/lib/api";
import { Cta } from "@/components/cta";
import { DemoConversation } from "@/components/catalog/demo-conversation";
import { SavingsCalculator } from "@/components/catalog/savings-calculator";
import { PageHeader } from "@/components/page-header";
import { Check, Clock } from "@/components/icons";

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

const sectionTitle = "text-2xl text-ink-900 sm:text-3xl";
const block = "card sm:p-8";

export default async function ProfessionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = await getProfession(slug);
  if (!p) notFound();

  const { content } = p;

  return (
    <article>
      {/* 1. Présentation */}
      <PageHeader
        narrow
        eyebrow={p.sector}
        title={`Voici ${content.assistantName}, ${content.assistantRole}`}
        intro={content.intro}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Cta href={`/employes-virtuels/${p.slug}/souscrire`} size="lg" arrow>
            {subscribeCopy.tryCta(content.assistantName, p.trialDays)}
          </Cta>
          <Cta href="#contrat" size="lg" variant="secondary">
            {`${p.monthlyPriceEur} € /mois`}
          </Cta>
        </div>
      </PageHeader>

      <div className="mx-auto flex max-w-prose flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        {/* 2. Sa journée type */}
        <section className={block}>
          <h2 className={sectionTitle}>Sa journée type</h2>
          <ol className="mt-6 space-y-5 border-l-4 border-primary-100 pl-6">
            {content.dayTimeline.map((m, i) => (
              <li key={i} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-white bg-primary-500 shadow-soft"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-0.5 font-heading font-bold tabular-nums text-primary-700">
                  <Clock className="h-4 w-4" />
                  {m.time}
                </span>
                <p className="mt-2 text-base text-ink-700">{m.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* 3. Ce qu'il sait faire */}
          <section className={`${block} border-primary-100 bg-primary-50`}>
            <h2 className="text-xl text-ink-900">Ce qu&apos;{content.assistantName} sait faire</h2>
            <ul className="mt-5 space-y-3">
              {content.canDo.map((c, i) => (
                <li key={i} className="flex gap-3 text-base text-ink-900">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Ce qu'il ne fait pas */}
          <section className={block}>
            <h2 className="text-xl text-ink-900">Ce qu&apos;{content.assistantName} ne fait pas</h2>
            <ul className="mt-5 space-y-3">
              {content.cannotDo.map((c, i) => (
                <li key={i} className="flex gap-3 text-base text-ink-700">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-100 font-bold text-ink-700"
                  >
                    –
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 5. Démonstration */}
        <section className={block}>
          <h2 className={sectionTitle}>Une conversation, en vrai</h2>
          <div className="mt-6">
            <DemoConversation demo={content.demo} assistantName={content.assistantName} />
          </div>
        </section>

        {/* 6. Ce qu'il vous fait gagner */}
        <section className={block}>
          <h2 className={sectionTitle}>Ce qu&apos;{content.assistantName} vous fait gagner</h2>
          <div className="mt-6">
            <SavingsCalculator savings={content.savings} />
          </div>
        </section>

        {/* 7. Son contrat */}
        <section id="contrat" className={`${block} scroll-mt-28 border-2 border-primary-600`}>
          <h2 className={sectionTitle}>Son contrat</h2>
          <p className="mt-5 text-lg text-ink-900">
            <span className="font-heading text-4xl font-bold text-ink-950">{p.monthlyPriceEur} €</span>
            <span className="text-ink-500">/mois, TTC</span>
          </p>
          <p className="mt-1 text-base text-ink-700">
            {p.setupPriceEur > 0
              ? `Mise en service ${p.setupPriceEur} €`
              : "Mise en service offerte"}
          </p>
          <ul className="mt-6 space-y-3">
            {content.contract.included.map((c, i) => (
              <li key={i} className="flex gap-3 text-base text-ink-700">
                <Check className="mt-1 h-5 w-5 shrink-0 text-primary-600" />
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-md bg-ink-50 p-4 text-base text-ink-700">
            {content.contract.cancellation}
          </p>
          <p className="mt-4 text-base text-ink-700">
            <Link href="/tarifs" className="font-semibold text-primary-700 underline">
              Comparer avec le sur-mesure
            </Link>{" "}
            — {offersCopy.subtitle.toLowerCase()}
          </p>
        </section>

        {/* 8. Appels à l'action */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Cta href={`/employes-virtuels/${p.slug}/souscrire`} size="lg" arrow>
            {subscribeCopy.tryCta(content.assistantName, p.trialDays)}
          </Cta>
          <Cta href="/questionnaire" size="lg" variant="secondary">
            {subscribeCopy.customCta}
          </Cta>
        </div>
      </div>
    </article>
  );
}
