import { test, expect, apiLogin, requestMagicToken, uniqueEmail } from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * Critère d'acceptation §11 :
 * « Le parcours complet je découvre la landing → je choisis le dentiste →
 *   je paie → mon assistant est actif passe en test. »
 *
 * Ici : parcours « prêt à l'emploi » (essai gratuit, sans frais de mise en
 * service). Le parcours « sur mesure » avec devis payant est couvert à part.
 */
test("landing → fiche dentiste → connexion → souscription → employé virtuel actif", async ({
  page,
  api,
}) => {
  const email = uniqueEmail("mvp");

  // 1. La landing
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 2. Le catalogue, puis la fiche du dentiste (le métier « Cabinet dentaire »)
  await page.goto("/employes-virtuels");
  await page.locator('a[href="/employes-virtuels/dentiste"]').first().click();
  await expect(page).toHaveURL(/\/employes-virtuels\/dentiste$/);

  // 3. « Mettre … au travail » → connexion requise (redirection avec suite)
  await page.getByRole("link", { name: /au travail/i }).click();
  await expect(page).toHaveURL(/\/connexion\?suite=/);

  // 4. Demande du lien de connexion
  await page.getByLabel(/adresse email/i).fill(email);
  await page.getByRole("button", { name: /recevoir mon lien/i }).click();
  await expect(page.getByText(/cliquez sur le lien|c'est envoyé/i)).toBeVisible();

  // 5. Suivre le lien magique (récupéré via Mailpit) → retour sur la souscription
  const token = await requestMagicToken(api, email);
  await page.goto(`/connexion/verifier?token=${token}`);
  await expect(page).toHaveURL(/\/employes-virtuels\/dentiste\/souscrire/);

  // 6. Souscrire → création de l'employé virtuel → « premier jour »
  await page.getByRole("button", { name: /au travail/i }).click();
  await expect(page).toHaveURL(/\/mon-equipe\/assistants\/[0-9a-f-]+\/premier-jour/, {
    timeout: 20_000,
  });
  const assistantId = page.url().match(/assistants\/([0-9a-f-]+)\/premier-jour/)?.[1];
  expect(assistantId).toBeTruthy();

  // 7. Finaliser la mise en service via l'API (les 4 écrans « premier jour »
  //    seront pilotés par l'UI une fois les data-testid posés — cf. README).
  const s = await apiLogin(api, email);
  const onboarding = await api.post(`${API}/me/assistants/${assistantId}/onboarding`, {
    headers: s.headers,
    data: {
      step: 3,
      establishment: { name: "Cabinet e2e", address: "1 rue du Test", openingHours: "9h-18h" },
      contactPrefs: { email, phone: "0600000000", inbox: "" },
    },
  });
  expect(onboarding.ok(), "onboarding").toBeTruthy();

  const activate = await api.post(`${API}/me/assistants/${assistantId}/activate`, {
    headers: s.headers,
  });
  expect(activate.ok(), "activate").toBeTruthy();
  expect((await activate.json()).state).toBe("au_travail");

  // 8. « Mon équipe » montre l'employé virtuel au travail
  await page.goto("/mon-equipe");
  await expect(page.getByText(/au travail/i).first()).toBeVisible();
});
