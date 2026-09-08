import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  /** Affiche un état d'attente et désactive le bouton. */
  loading?: boolean;
  children: ReactNode;
}

/**
 * Cible tactile 44px minimum, texte 16px minimum (§9.5).
 * `loading` remplace le libellé par un état d'attente explicite, jamais une roue nue.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx("tnd-btn", `tnd-btn--${variant}`, `tnd-btn--${size}`, className)}
    >
      {loading ? "Un instant…" : children}
    </button>
  );
}
