import { test, expect, apiLogin, uniqueEmail, webLogin, API_URL } from "../fixtures/velekya";

const API = `${API_URL}/api/v1`;

/**
 * Lot 22 — carte enregistrée et prélèvement automatique (fournisseur `fake` :
 * carte de démonstration « Visa 4242 », confirmée sur place).
 */
test("enregistrer, voir puis retirer sa carte depuis « Mes documents »", async ({ page, api }) => {
  const email = uniqueEmail("carte");
  await webLogin(page, api, email);
  const session = await apiLogin(api, email);

  // Un contrat est nécessaire pour voir la section.
  const sub = await api.post(`${API}/me/catalog/subscribe`, {
    headers: session.headers,
    data: { slug: "garagiste" },
  });
  expect(sub.ok()).toBeTruthy();

  await page.goto("/mon-equipe/documents");
  const section = page.getByTestId("saved-card");
  await expect(section).toContainText("Prélèvement automatique");
  await section.getByRole("button", { name: "Enregistrer ma carte" }).click();
  await expect(page.getByTestId("saved-card-label")).toContainText("Visa se terminant par 4242");
  await expect(section.getByRole("status")).toContainText("Votre carte est enregistrée.");

  // L'API la montre aussi, sans rien d'autre que marque, 4 chiffres et expiration.
  const docs = await (await api.get(`${API}/me/documents`, { headers: session.headers })).json();
  expect(docs.savedCard).toMatchObject({ brand: "visa", last4: "4242" });
  expect(Object.keys(docs.savedCard).sort()).toEqual(["activatedAt", "brand", "expMonth", "expYear", "last4"]);

  await section.getByRole("button", { name: "Retirer la carte" }).click();
  await expect(section.getByRole("status")).toContainText("La carte est retirée.");
  await expect(page.getByTestId("saved-card-label")).toHaveCount(0);
  const after = await (await api.get(`${API}/me/documents`, { headers: session.headers })).json();
  expect(after.savedCard).toBeNull();
});

test("la confirmation de démonstration est cloisonnée par entreprise", async ({ api }) => {
  const a = await apiLogin(api, uniqueEmail("carte-a"));
  const b = await apiLogin(api, uniqueEmail("carte-b"));
  const setup = await (await api.post(`${API}/me/saved-card/setup`, { headers: a.headers })).json();
  expect(setup.setupRef).toMatch(/^fake_setup_/);

  const stolen = await api.post(`${API}/me/saved-card/${setup.setupRef}/confirm`, { headers: b.headers });
  expect(stolen.status()).toBe(404);
  const own = await api.post(`${API}/me/saved-card/${setup.setupRef}/confirm`, { headers: a.headers });
  expect(own.ok()).toBeTruthy();
  expect((await own.json()).last4).toBe("4242");
});
