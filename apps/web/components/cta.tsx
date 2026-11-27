import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "./icons";

type Variant = "primary" | "secondary" | "light";
type Size = "md" | "lg";

const styles: Record<Variant, string> = {
  // Charte §7 : boutons bordeaux sur fond clair ou sombre.
  primary: "bg-accent-600 text-white hover:bg-accent-700",
  secondary:
    "border-2 border-primary-900 bg-white text-primary-900 hover:bg-primary-50",
  light: "bg-white text-primary-900 hover:bg-primary-50",
};

const sizes: Record<Size, string> = {
  md: "min-h-[52px] px-6 py-3 text-base",
  lg: "min-h-[60px] px-8 py-4 text-lg",
};

/**
 * Lien d'appel à l'action. Bouton à coins de 12px (charte §5), texte 18px minimum, cible 52px
 * minimum (§9.5). `arrow` ajoute une flèche décorative pour guider l'œil.
 */
export function Cta({
  href,
  variant = "primary",
  size = "md",
  arrow = false,
  children,
  className = "",
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      {...rest}
      className={`group inline-flex items-center justify-center gap-2 rounded-lg text-center font-semibold no-underline transition duration-200 hover:-translate-y-0.5 ${sizes[size]} ${styles[variant]} ${className}`}
    >
      {children}
      {arrow ? (
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
      ) : null}
    </Link>
  );
}
