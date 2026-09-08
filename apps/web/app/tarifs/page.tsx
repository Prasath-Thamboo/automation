import type { Metadata } from "next";
import { offers, offerRows, offersCopy } from "@tando/copy";
import { Section } from "@/components/section";
import { Cta } from "@/components/cta";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Des tarifs mensuels, toutes taxes comprises, sans engagement. Vous arrêtez quand vous voulez.",
  alternates: { canonical: "/tarifs" },
};

export default function TarifsPage() {
  return (
    <>
      <Section className="max-w-content">
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{offersCopy.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-700">{offersCopy.subtitle}</p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className={`flex flex-col rounded-lg border p-6 ${
                offer.highlight
                  ? "border-primary-600 bg-primary-50"
                  : "border-ink-100 bg-white"
              }`}
            >
              <h2 className="text-xl font-bold text-ink-900">{offer.name}</h2>
              <p className="mt-2 text-base text-ink-700">{offer.tagline}</p>
              <p className="mt-6">
                <span className="font-heading text-3xl font-bold text-ink-900">
                  {offer.monthlyPrice}
                </span>
                <span className="text-base text-ink-500">{offer.monthlySuffix}</span>
              </p>
              <p className="mt-1 text-sm text-ink-500">Mise en service : {offer.setupPrice}</p>
              <Cta
                href={offer.ctaHref}
                variant={offer.highlight ? "primary" : "secondary"}
                className="mt-6 self-start"
              >
                {offer.cta}
              </Cta>
            </article>
          ))}
        </div>
      </Section>

      <Section muted className="max-w-content">
        <h2 className="text-2xl font-bold text-ink-900">Comparer les formules</h2>
        <div className="mt-6 overflow-x-auto">
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

      <Section className="max-w-content">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-ink-900">{offersCopy.stopTitle}</h2>
          <p className="mt-4 text-lg text-ink-700">{offersCopy.stopBody}</p>
        </div>
      </Section>
    </>
  );
}
