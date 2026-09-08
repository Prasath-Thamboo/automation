import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "border border-primary-600 bg-white text-primary-700 hover:bg-primary-50",
};

/** Lien d'appel à l'action. Cible tactile 44px minimum, texte 16px minimum (§9.5). */
export function Cta({
  href,
  variant = "primary",
  children,
  className = "",
  ...rest
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      {...rest}
      className={`inline-flex min-h-touch items-center justify-center rounded-md px-6 py-3 text-base font-semibold no-underline transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
