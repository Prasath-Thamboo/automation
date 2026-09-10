import { test, expect, webLogin, uniqueEmail } from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * §9.4 : en-têtes de sécurité, pas de fuite d'implémentation. Vérifie le rendu
 * réel des réponses (web Next + API Nest). Le rate limiting est couvert par les
 * tests unitaires (`env.test.ts`), coupé ici via RATE_LIMIT_DISABLED.
 */

test("le web renvoie les en-têtes de sécurité", async ({ page }) => {
  const res = await page.request.get("/");
  expect(res.ok()).toBeTruthy();
  const h = res.headers();

  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("geolocation=()");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"], "pas de X-Powered-By").toBeUndefined();
});

test("l'API renvoie les en-têtes de sécurité et ne fuit pas sa pile", async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.ok()).toBeTruthy();
  const h = res.headers();

  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]?.toLowerCase()).toBe("deny");
  expect(h["x-powered-by"], "pas de X-Powered-By").toBeUndefined();
  expect(h["x-dns-prefetch-control"], "en-têtes helmet présents").toBeDefined();
});

test("l'espace client n'est pas indexable", async ({ page, api }) => {
  await webLogin(page, api, uniqueEmail("noindex"));
  const res = await page.request.get("/mon-equipe/compte");
  expect(await res.text()).toMatch(/name="robots"[^>]*noindex/i);
});
