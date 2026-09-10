import { test, expect } from "../fixtures/tando";

/**
 * Vitrine publique : les pages se chargent, portent une identité claire, et
 * aucun jargon interdit (§2 / §11) n'apparaît dans le TEXTE VISIBLE.
 *
 * Le contrôle exhaustif de la source vit dans `packages/copy` ; ici on vérifie
 * le rendu réel du navigateur. Sous-ensemble sans ambiguïté (« agent » seul,
 * « modèle », « API »… peuvent apparaître dans du métier légitime).
 */
const PUBLIC_PAGES = [
  "/",
  "/tarifs",
  "/faq",
  "/employes-virtuels",
  "/employes-virtuels/dentiste",
  "/questionnaire",
  "/mentions-legales",
  "/cgv",
  "/confidentialite",
  "/cookies",
  "/contact",
];

const FORBIDDEN = [
  /\bagent IA\b/i,
  /\bLLM\b/i,
  /\bprompt(s)?\b/i,
  /\bchatbot(s)?\b/i,
  /\bIA g[ée]n[ée]rative\b/i,
  /\bRAG\b/,
  /\bfine-tuning\b/i,
  /\bembedding(s)?\b/i,
  /\bworkflow(s)?\b/i,
  /\borchestration\b/i,
  /\bpipeline(s)?\b/i,
];

for (const path of PUBLIC_PAGES) {
  test(`${path} — se charge, un seul h1, sans jargon`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `${path} statut HTTP`).toBeLessThan(400);

    await expect(page.locator("html")).toHaveAttribute("lang", /fr/i);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const text = await page.locator("body").innerText();
    for (const rx of FORBIDDEN) {
      expect(rx.test(text), `${path} contient « ${rx} »`).toBe(false);
    }
  });
}

test("la landing pose la marque et une action claire", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/employ[ée] virtuel/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /employ[ée]s virtuels|découvrir|voir/i }).first()).toBeVisible();
});
