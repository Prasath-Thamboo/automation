import { site } from "@tando/copy";

/** Base d'URL publique (métadonnées, sitemap, canoniques). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;

/** Données structurées Organisation (JSON-LD), injectées dans le layout. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: SITE_URL,
    slogan: site.baseline,
    description: site.description,
    email: site.contact.email,
    areaServed: "FR",
  };
}
