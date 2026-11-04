import {
  test,
  expect,
  activateAssistant,
  hireViaQuote,
  uniqueEmail,
  webLogin,
} from "../fixtures/tando";

/**
 * Critère d'acceptation §11 : « je découvre la landing → je choisis mon
 * métier → … → mon assistant est actif ».
 *
 * Un seul chemin d'embauche : le client décrit son besoin, l'équipe Tando
 * prépare son employé (devis relu et envoyé), le client accepte, puis le met
 * au travail. Le détail du devis est couvert par `parcours-sur-mesure`.
 */
test("landing → fiche dentiste → besoin → devis accepté → employé virtuel actif", async ({
  page,
  api,
}) => {
  const email = uniqueEmail("mvp");

  // 1. La landing
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 2. Le catalogue, puis la fiche du dentiste (vitrine)
  await page.goto("/employes-virtuels");
  await page.locator('a[href="/employes-virtuels/dentiste"]').first().click();
  await expect(page).toHaveURL(/\/employes-virtuels\/dentiste$/);

  // 3. L'appel secondaire (besoin plus précis) mène au questionnaire ; le
  //    libre-service est couvert par `pret-a-l-emploi.spec.ts`.
  await page.getByRole("link", { name: /quelque chose de plus précis/i }).last().click();
  await expect(page).toHaveURL(/\/questionnaire/);

  // 4. Besoin → devis envoyé par le back-office → acceptation (via l'API)
  const { session, assistantId } = await hireViaQuote(api, email);

  // 5. Mise en service (les 4 écrans « premier jour » finalisés par l'API —
  //    pas encore de data-testid sur ces écrans)
  await activateAssistant(api, session, assistantId);

  // 6. « Mon équipe » montre l'employé virtuel au travail
  await webLogin(page, api, email);
  await page.goto("/mon-equipe");
  await expect(page.getByText(/au travail/i).first()).toBeVisible();
});
