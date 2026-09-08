import type { Metadata } from "next";
import Link from "next/link";
import { faq, faqCopy } from "@tando/copy";

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
    <div className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{faqCopy.title}</h1>
      <p className="mt-4 text-lg text-ink-700">
        {faqCopy.subtitle}{" "}
        <Link href="/contact" className="font-semibold text-primary-700">
          Nous écrire
        </Link>
        .
      </p>

      <ul className="mt-10 divide-y divide-ink-100 border-y border-ink-100">
        {faq.map((item) => (
          <li key={item.q}>
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="text-primary-700 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-ink-700">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
