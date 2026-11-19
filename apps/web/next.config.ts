import path from "node:path";
import type { NextConfig } from "next";

/**
 * En-têtes de sécurité (§9.4). Appliqués à toutes les routes ; seul le
 * formulaire public (`/formulaire/*`) peut être affiché dans un cadre.
 * HSTS n'a d'effet qu'en HTTPS ; inoffensif en local.
 * La CSP (nonce par requête, `frame-ancestors`) est posée par `middleware.ts`.
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
 * on ne connaît pas l'adresse — cadrage autorisé (`frame-ancestors *` dans la
 * CSP du middleware), pour cette route seulement.
 */
const embeddableHeaders = commonHeaders;

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@velekya/ui", "@velekya/copy", "@velekya/api-client", "@velekya/types"],
  experimental: {
    // Les packages de l'atelier sont en TS non transpilé.
    externalDir: true,
  },
  /**
   * `@velekya/types` est publié compilé en CommonJS (`dist/`, pour l'API Nest).
   * Lien pnpm hors de `node_modules` : `next dev` y injecte le rechargement à
   * chaud (`import.meta.webpackHot`), invalide en CommonJS → « Cannot use
   * 'import.meta' outside a module ». Le web le compile donc depuis ses
   * sources TypeScript, comme `@velekya/copy` et `@velekya/api-client`.
   */
  webpack(webpackConfig: { resolve: { alias?: Record<string, string | false | string[]> } }) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@velekya/types$": path.resolve(__dirname, "../../packages/types/src/index.ts"),
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
