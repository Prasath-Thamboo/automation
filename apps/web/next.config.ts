import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tando/ui", "@tando/copy", "@tando/api-client", "@tando/types"],
  experimental: {
    // Les packages de l'atelier sont en TS non transpilé.
    externalDir: true,
  },
};

export default config;
