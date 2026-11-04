import type { ReactNode } from "react";
import { PageHeader } from "./page-header";

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
    <>
      <PageHeader
        narrow
        title={title}
        intro={
          intro || meta ? (
            <>
              {intro ? <p>{intro}</p> : null}
              {meta ? <p className="mt-2 text-base text-ink-500">{meta}</p> : null}
            </>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-prose space-y-10 px-4 py-12 sm:px-6 sm:py-16">{children}</div>
    </>
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
      <h2 className="text-xl text-ink-900 sm:text-2xl">{heading}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-3 text-base leading-relaxed text-ink-700">
          {p}
        </p>
      ))}
    </section>
  );
}
