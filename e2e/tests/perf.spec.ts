import { test, expect } from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * §9.1 — sondes de santé et budgets de latence (garde-fou grossier, seuils
 * larges : détecte un effondrement, pas une micro-régression).
 */

test("liveness : 200, rapide, sans dépendance", async ({ request }) => {
  const t0 = Date.now();
  const res = await request.get(`${API}/health/live`);
  const ms = Date.now() - t0;

  expect(res.status()).toBe(200);
  expect((await res.json()).status).toBe("ok");
  expect(ms, `liveness en ${ms}ms`).toBeLessThan(500);
});

test("readiness : 200 quand la pile est saine, forme attendue", async ({ request }) => {
  const res = await request.get(`${API}/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.checks).toEqual({ database: "ok", redis: "ok" });
});

test("la landing répond dans le budget", async ({ page }) => {
  const t0 = Date.now();
  const res = await page.goto("/");
  const ms = Date.now() - t0;

  expect(res?.status()).toBe(200);
  expect(ms, `landing en ${ms}ms`).toBeLessThan(3000);
});

test("l'API compresse les réponses volumineuses", async ({ request }) => {
  const res = await request.get(`${API}/catalog/professions`, {
    headers: { "Accept-Encoding": "gzip, deflate, br" },
  });
  expect(res.ok()).toBeTruthy();
  // compression ajoute Vary: Accept-Encoding dès qu'elle s'applique ou pourrait s'appliquer
  expect((res.headers()["vary"] ?? "").toLowerCase()).toContain("accept-encoding");
});
