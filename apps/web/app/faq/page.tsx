import type { Metadata } from "next";
import Link from "next/link";
import { faq, faqCopy } from "@velekya/copy";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: faqCopy.subtitle,
  alternates: { canonical: "/faq" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        narrow
        title={faqCopy.title}
        intro={
          <p>
            {faqCopy.subtitle}{" "}
            <Link href="/contact" className="font-semibold text-primary-700 underline">
              Nous écrire
            </Link>
            .
          </p>
        }
      />
      <div className="mx-auto max-w-prose px-4 py-12 sm:px-6 sm:py-16">
        <ul className="space-y-3">
          {faq.map((item) => (
            <li key={item.q}>
              <details className="group rounded-lg border border-ink-100 bg-white shadow-soft transition-shadow open:shadow-card">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 text-lg font-bold text-ink-900 hover:bg-ink-50 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-2xl leading-none text-primary-700 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-base leading-relaxed text-ink-700">{item.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
