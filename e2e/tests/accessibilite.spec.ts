import AxeBuilder from "@axe-core/playwright";
import { test, expect, webLogin, uniqueEmail } from "../fixtures/tando";

/**
 * Critère d'acceptation §11 / §9.5 : « Tout le produit est utilisable au clavier
 * et lisible en contraste AA. »
 *
 * axe-core, règles WCAG 2.1 A + AA. On bloque sur les violations "serious" et
 * "critical" ; les "moderate"/"minor" sont listées sans faire échouer (dette
 * suivie, pas régression).
 */

const RULESET = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const BLOCKING = new Set(["serious", "critical"]);

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  const { violations } = await new AxeBuilder({ page }).withTags(RULESET).analyze();

  const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ""));
  const report = blocking
    .map((v) => `  • [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length}) ${v.helpUrl}`)
    .join("\n");
  expect(blocking, `${path} — violations a11y bloquantes :\n${report}`).toEqual([]);
}

const PUBLIC_PAGES = [
  "/",
  "/tarifs",
  "/faq",
  "/employes-virtuels",
  "/employes-virtuels/dentiste",
  "/questionnaire",
  "/connexion",
  "/contact",
  "/cgv",
  "/mentions-legales",
];

for (const path of PUBLIC_PAGES) {
  test(`a11y — ${path}`, async ({ page }) => {
    await audit(page, path);
  });
}

test("a11y — espace client (Mon équipe)", async ({ page, api }) => {
  await webLogin(page, api, uniqueEmail("a11y"));
  await audit(page, "/mon-equipe");
});
