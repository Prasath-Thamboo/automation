import type { Metadata } from "next";
import type { ReactNode } from "react";
import { site, nav } from "@tando/copy";
import "@tando/ui/styles.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { SITE_URL, organizationJsonLd } from "@/lib/site";

// Typographie : pile système (rapide, aucune requête tierce — cohérent avec
// « données en France »). Une police de marque auto-hébergée (next/font/local +
// woff2 versionnés) pourra être ajoutée sans toucher au reste.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.baseline,
    template: "%s · Tando",
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: SITE_URL,
    siteName: site.name,
    title: site.baseline,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.baseline, description: site.description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col bg-paper text-ink-900">
        <script
          type="application/ld+json"
          // Données structurées : contenu statique, pas d'entrée utilisateur.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-ink-900 focus:shadow"
        >
          {nav.skipToContent}
        </a>
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
