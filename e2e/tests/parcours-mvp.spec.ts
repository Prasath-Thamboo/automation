import {
  test,
  expect,
  hireViaQuote,
  uniqueEmail,
  webLogin,
} from "../fixtures/velekya";

/**
 * Critère d'acceptation §11 : « je découvre la landing → je choisis mon
 * métier → … → mon assistant est actif ».
 *
 * Un seul chemin d'embauche : le client décrit son besoin, l'équipe Velekya
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
  const { assistantId } = await hireViaQuote(api, email);

  // 5. Mise en service : les 4 écrans « premier jour », au clavier et à la souris
  await webLogin(page, api, email);
  await page.goto(`/mon-equipe/assistants/${assistantId}/premier-jour`);
  const pj = page.getByTestId("premier-jour");
  await expect(pj.getByTestId("pj-etape-informations")).toBeVisible();
  await pj.getByTestId("pj-nom").fill("Cabinet E2E");
  await pj.getByTestId("pj-adresse").fill("1 rue du Test, Paris");
  await pj.getByTestId("pj-horaires").fill("Lun-Ven 9h-18h");
  await pj.getByTestId("pj-suivant").click();

  // L'écran des spécificités n'existe que si le métier en déclare.
  const contact = pj.getByTestId("pj-etape-contact");
  const specifics = pj.getByTestId("pj-etape-specificites");
  await expect(contact.or(specifics)).toBeVisible();
  if (await specifics.isVisible()) await pj.getByTestId("pj-suivant").click();

  await expect(contact).toBeVisible();
  await pj.getByTestId("pj-email").fill(email);
  await pj.getByTestId("pj-telephone").fill("0600000000");
  await pj.getByTestId("pj-reception").selectOption("email");
  await pj.getByTestId("pj-suivant").click();

  await expect(pj.getByTestId("pj-etape-essai")).toBeVisible();
  await pj.getByTestId("pj-commencer").click();
  // « Il peut commencer » ramène sur sa fiche.
  await expect(page).toHaveURL(new RegExp(`/mon-equipe/assistants/${assistantId}$`));

  // 6. « Mon équipe » montre l'employé virtuel au travail
  await page.goto("/mon-equipe");
  await expect(page.getByText(/au travail/i).first()).toBeVisible();
});
