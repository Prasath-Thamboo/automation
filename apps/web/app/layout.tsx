import type { Metadata } from "next";
import type { ReactNode } from "react";
import { site, nav } from "@velekya/copy";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "@velekya/ui/styles.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { HideWhenEmbedded } from "@/components/hide-when-embedded";
import { SITE_URL, organizationJsonLd } from "@/lib/site";

// Typographie auto-hébergée (paquets @fontsource, servis par notre propre
// serveur : aucune requête tierce, build sans réseau). Corps : Atkinson
// Hyperlegible Next, dessinée pour les lecteurs malvoyants. Titres : Bricolage
// Grotesque.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.baseline,
    template: "%s · Velekya",
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-5 focus:py-3 focus:text-lg focus:font-bold focus:text-ink-900 focus:shadow-lift"
        >
          {nav.skipToContent}
        </a>
        <HideWhenEmbedded>
          <SiteHeader />
        </HideWhenEmbedded>
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <HideWhenEmbedded>
          <SiteFooter />
          <CookieConsent />
        </HideWhenEmbedded>
      </body>
    </html>
  );
}
