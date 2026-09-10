import { defineConfig, devices } from "@playwright/test";

/**
 * Tests end-to-end des parcours critiques (Lot 11, §11 du cahier des charges).
 *
 * Prérequis : la pile complète tourne (`pnpm db:up` + API :3333 + web :3000).
 * En local, `reuseExistingServer` réutilise un `pnpm dev` déjà lancé ; sinon
 * Playwright démarre l'API et le web à partir des builds (`pnpm build` d'abord).
 */

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const API_URL = process.env.API_URL ?? "http://localhost:3333";
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./fixtures/global-setup.ts",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Nos utilisateurs sont sur téléphone : la vitrine repasse en viewport mobile.
    // Les parcours authentifiés sont indépendants du viewport → chromium suffit.
    {
      name: "mobile",
      testMatch: /vitrine\.spec\.ts$/,
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: [
    {
      command: "pnpm --filter @tando/api start",
      cwd: "..",
      url: `${API_URL}/api/v1/health`,
      reuseExistingServer: !CI,
      timeout: 120_000,
      stdout: "pipe",
    },
    {
      command: "pnpm --filter @tando/web start",
      cwd: "..",
      url: WEB_URL,
      reuseExistingServer: !CI,
      timeout: 120_000,
      stdout: "pipe",
    },
  ],
});
