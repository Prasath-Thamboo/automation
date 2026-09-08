import type { ReactNode } from "react";

/** Gabarit des pages de contenu (légal, FAQ) : titre, intro, colonne de lecture. */
export function ContentPage({
  title,
  intro,
  meta,
  children,
}: {
  title: string;
  intro?: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-4 text-lg text-ink-700">{intro}</p> : null}
      {meta ? <p className="mt-2 text-sm text-ink-500">{meta}</p> : null}
      <div className="mt-10 space-y-8">{children}</div>
    </div>
  );
}

export function ContentSection({
  heading,
  paragraphs,
}: {
  heading: string;
  paragraphs: readonly string[];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">{heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-3 text-base leading-relaxed text-ink-700">
          {p}
        </p>
      ))}
    </section>
  );
}
