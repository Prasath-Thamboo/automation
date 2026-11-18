import type { Metadata } from "next";
import { offers, offerRows, offersCopy } from "@velekya/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";
import { PageHeader } from "@/components/page-header";
import { Check } from "@/components/icons";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Des tarifs mensuels, toutes taxes comprises, sans engagement. Vous arrêtez quand vous voulez.",
  alternates: { canonical: "/tarifs" },
};

export default function TarifsPage() {
  return (
    <>
      <PageHeader title={offersCopy.title} intro={offersCopy.subtitle} />
      <Section className="!pt-12 sm:!pt-16">
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className={`flex flex-col rounded-xl p-7 sm:p-8 ${
                offer.highlight
                  ? "border-2 border-primary-600 bg-white shadow-lift ring-8 ring-primary-50"
                  : "border border-ink-100 bg-white shadow-soft"
              }`}
            >
              <h2 className="text-2xl text-ink-900">{offer.name}</h2>
              <p className="mt-2 text-base text-ink-700">{offer.tagline}</p>
              <p className="mt-6 flex flex-wrap items-baseline gap-1">
                <span className="font-heading text-4xl font-bold text-ink-950">
                  {offer.monthlyPrice}
                </span>
                <span className="text-base text-ink-500">{offer.monthlySuffix}</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-base text-ink-700">
                <Check className="h-5 w-5 shrink-0 text-primary-600" />
                Mise en service : {offer.setupPrice}
              </p>
              <div className="flex-1" />
              <Cta
                href={offer.ctaHref}
                variant={offer.highlight ? "primary" : "secondary"}
                arrow
                className="mt-8 w-full"
              >
                {offer.cta}
              </Cta>
            </article>
          ))}
        </div>
      </Section>

      <Section muted>
        <h2 className="text-2xl text-ink-900 sm:text-3xl">Comparer les formules</h2>
        <div
          role="region"
          aria-label="Comparer les formules"
          tabIndex={0}
          className="mt-8 overflow-x-auto rounded-lg border border-ink-100 bg-white px-5 shadow-soft"
        >
          <table className="w-full min-w-[36rem] border-collapse text-left text-base">
            <thead>
              <tr>
                <th className="border-b border-ink-100 py-3 pr-4 font-semibold text-ink-500">
                  <span className="sr-only">Critère</span>
                </th>
                {offers.map((o) => (
                  <th key={o.id} className="border-b border-ink-100 py-3 pr-4 font-semibold text-ink-900">
                    {o.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offerRows.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="border-b border-ink-100 py-3 pr-4 font-normal text-ink-700"
                  >
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className="border-b border-ink-100 py-3 pr-4 text-ink-900">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-2xl text-sm text-ink-500">{offersCopy.footnote}</p>
      </Section>

      <Section>
        <div className="max-w-3xl rounded-xl bg-primary-50 p-8 sm:p-10">
          <h2 className="text-2xl text-ink-900 sm:text-3xl">{offersCopy.stopTitle}</h2>
          <p className="mt-4 text-lg text-ink-700">{offersCopy.stopBody}</p>
        </div>
      </Section>
    </>
  );
}
