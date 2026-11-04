import type { ReactNode } from "react";
import { ClientNav } from "@/components/client-nav";

/** Espace client : onglets communs au-dessus de chaque page. */
export default function MonEquipeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-paper">
      <ClientNav />
      {children}
    </div>
  );
}
