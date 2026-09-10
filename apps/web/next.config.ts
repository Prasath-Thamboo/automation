import type { NextConfig } from "next";

/**
 * En-têtes de sécurité (§9.4). Appliqués à toutes les routes.
 * HSTS n'a d'effet qu'en HTTPS ; inoffensif en local.
 * Pas de CSP complète ici : elle demande un nonce par requête (dette suivie —
 * voir SECURITY.md).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@tando/ui", "@tando/copy", "@tando/api-client", "@tando/types"],
  experimental: {
    // Les packages de l'atelier sont en TS non transpilé.
    externalDir: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
