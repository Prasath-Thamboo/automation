import path from "node:path";
import type { NextConfig } from "next";

/**
 * En-têtes de sécurité (§9.4). Appliqués à toutes les routes ; seul le
 * formulaire public (`/formulaire/*`) peut être affiché dans un cadre.
 * HSTS n'a d'effet qu'en HTTPS ; inoffensif en local.
 * Pas de CSP complète ici : elle demande un nonce par requête (dette suivie —
 * voir SECURITY.md).
 */
const commonHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
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

/** Partout : jamais affiché dans un cadre. */
const securityHeaders = [...commonHeaders, { key: "X-Frame-Options", value: "DENY" }];

/**
 * Formulaire public (Lot 12) : le patron l'affiche dans son propre site, dont
 * on ne connaît pas l'adresse — cadrage autorisé, pour cette route seulement.
 */
const embeddableHeaders = [
  ...commonHeaders,
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@tando/ui", "@tando/copy", "@tando/api-client", "@tando/types"],
  experimental: {
    // Les packages de l'atelier sont en TS non transpilé.
    externalDir: true,
  },
  /**
   * `@tando/types` est publié compilé en CommonJS (`dist/`, pour l'API Nest).
   * Lien pnpm hors de `node_modules` : `next dev` y injecte le rechargement à
   * chaud (`import.meta.webpackHot`), invalide en CommonJS → « Cannot use
   * 'import.meta' outside a module ». Le web le compile donc depuis ses
   * sources TypeScript, comme `@tando/copy` et `@tando/api-client`.
   */
  webpack(webpackConfig: { resolve: { alias?: Record<string, string | false | string[]> } }) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@tando/types$": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    };
    return webpackConfig;
  },
  async headers() {
    return [
      { source: "/:path((?!formulaire/).*)", headers: securityHeaders },
      { source: "/formulaire/:path*", headers: embeddableHeaders },
    ];
  },
};

export default config;
