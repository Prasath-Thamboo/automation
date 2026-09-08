import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@tando/ui/styles.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "Tando — votre employé virtuel, 24h/24, 7j/7.",
    template: "%s · Tando",
  },
  description:
    "Tando vous prépare un employé virtuel qui répond à vos clients, prend vos rendez-vous et gère vos demandes courantes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SiteHeader />
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>{children}</main>
      </body>
    </html>
  );
}
