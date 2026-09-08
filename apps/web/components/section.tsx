import type { ReactNode } from "react";

/** Bloc de contenu pleine largeur avec conteneur centré. */
export function Section({
  children,
  className = "",
  muted = false,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  as?: "section" | "div";
}) {
  return (
    <Tag className={muted ? "bg-white" : ""}>
      <div className={`mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20 ${className}`}>
        {children}
      </div>
    </Tag>
  );
}
