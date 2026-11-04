import type { ReactNode } from "react";

type Tone = "paper" | "white" | "mint" | "dark";

const tones: Record<Tone, string> = {
  paper: "",
  white: "bg-white",
  mint: "bg-primary-50",
  dark: "bg-primary-900 text-white",
};

/** Bloc de contenu pleine largeur avec conteneur centré. */
export function Section({
  children,
  className = "",
  muted = false,
  tone,
  id,
  labelledBy,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  /** Raccourci historique pour `tone="white"`. */
  muted?: boolean;
  tone?: Tone;
  id?: string;
  labelledBy?: string;
  as?: "section" | "div";
}) {
  const t = tone ?? (muted ? "white" : "paper");
  return (
    <Tag id={id} aria-labelledby={labelledBy} className={tones[t]}>
      <div className={`mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24 lg:px-8 ${className}`}>
        {children}
      </div>
    </Tag>
  );
}

/** En-tête de section : surtitre facultatif, titre, chapeau. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  center = false,
  invert = false,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  center?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p className={invert ? "eyebrow bg-white/10 text-primary-100" : "eyebrow"}>{eyebrow}</p>
      ) : null}
      <h2
        id={id}
        className={`${eyebrow ? "mt-4" : ""} text-2xl sm:text-3xl lg:text-4xl ${invert ? "text-white" : "text-ink-900"}`}
      >
        {title}
      </h2>
      {intro ? (
        <p className={`mt-5 text-lg ${invert ? "text-primary-100" : "text-ink-700"}`}>{intro}</p>
      ) : null}
    </div>
  );
}
