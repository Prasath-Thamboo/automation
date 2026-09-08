import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import { site, nav } from "@tando/copy";
import "@tando/ui/styles.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { SITE_URL, organizationJsonLd } from "@/lib/site";

// Polices variables : on n'épingle pas de graisse, la variable CSS porte toute la
// plage et `font-weight` est piloté par les classes/feuilles de style.
const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

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
    <html lang="fr" className={`${body.variable} ${heading.variable}`}>
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
