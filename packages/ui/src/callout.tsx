import { clsx } from "clsx";
import type { ReactNode } from "react";

export interface CalloutProps {
  tone?: "info" | "success" | "warning";
  title?: string;
  children: ReactNode;
}

/** Encart d'information. Toujours un texte, jamais un écran vide (§9.5). */
export function Callout({ tone = "info", title, children }: CalloutProps) {
  return (
    <div className={clsx("tnd-callout", `tnd-callout--${tone}`)} role="status">
      {title ? <p className="tnd-callout__title">{title}</p> : null}
      <div className="tnd-callout__body">{children}</div>
    </div>
  );
}
