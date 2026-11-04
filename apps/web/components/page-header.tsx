import type { ReactNode } from "react";

/**
 * Bandeau d'en-tête des pages intérieures : grand titre lisible sur un fond
 * doux, chapeau facultatif. Garde la même hiérarchie partout (un seul h1).
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  narrow = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  narrow?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="bg-glow border-b border-ink-100">
      <div
        className={`mx-auto px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 ${narrow ? "max-w-prose" : "max-w-content"}`}
      >
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className={`${eyebrow ? "mt-4" : ""} max-w-3xl text-3xl text-ink-950 sm:text-4xl`}>
          {title}
        </h1>
        {intro ? <div className="mt-5 max-w-2xl text-lg text-ink-700 sm:text-xl">{intro}</div> : null}
        {children}
      </div>
    </div>
  );
}
