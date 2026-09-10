import { test, expect, apiLogin, webLogin, uniqueEmail } from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * Critère d'acceptation §11 :
 * « L'export et la suppression de compte fonctionnent réellement — depuis le
 *   web et depuis l'application mobile. » (ici : le web)
 * + §9.5 : la résiliation / suppression est aussi visible que la souscription.
 */

test("export RGPD : télécharge toutes les données du compte en JSON", async ({ page, api }) => {
  const email = uniqueEmail("rgpd-export");
  await webLogin(page, api, email);

  // Un peu de données à exporter
  const s = await apiLogin(api, email);
  await api.post(`${API}/me/catalog/subscribe`, { headers: s.headers, data: { slug: "dentiste" } });

  await page.goto("/mon-equipe/compte");
  await expect(page.getByRole("heading", { level: 1, name: "Mon compte" })).toBeVisible();

  // Le lien d'export sert un fichier JSON en pièce jointe
  const res = await page.request.get("/mon-equipe/compte/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(res.headers()["content-disposition"]).toContain("attachment");

  const data = await res.json();
  expect(JSON.stringify(data)).toContain(email);
});

test("suppression de compte : double confirmation, définitive, déconnecte", async ({ page, api }) => {
  const email = uniqueEmail("rgpd-delete");
  const session = await apiLogin(api, email);
  await webLogin(page, api, email);

  await page.goto("/mon-equipe/compte");
  const del = page.getByRole("button", { name: /supprimer définitivement/i });

  // Le bouton reste inactif tant que la confirmation n'est pas tapée exactement
  await expect(del).toBeDisabled();
  await page.getByPlaceholder(/SUPPRIMER/).fill("SUPPRIMER");
  await expect(del).toBeEnabled();

  await del.click();
  await expect(page).toHaveURL(/\/\?compte=supprime/);

  // La session navigateur est fermée
  await page.goto("/mon-equipe");
  await expect(page).toHaveURL(/\/connexion/);

  // Et le jeton d'API ne vaut plus rien
  const after = await api.get(`${API}/me/account`, { headers: session.headers });
  expect([401, 403]).toContain(after.status());
});
