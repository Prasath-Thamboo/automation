"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Pages affichées dans le site d'un patron (formulaire public) : sans l'habillage Velekya. */
export function HideWhenEmbedded({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/formulaire/")) return null;
  return <>{children}</>;
}
