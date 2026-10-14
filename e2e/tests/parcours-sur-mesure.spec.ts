import {
  test,
  expect,
  apiLogin,
  quoteTokenFromMail,
  staffSendsQuote,
  submitAssessment,
  uniqueEmail,
} from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * Critères d'acceptation §11 :
 * « Un devis accepté génère automatiquement une mission et une facture, sans
 *   intervention manuelle. » + acceptation en ligne horodatée.
 *
 * Parcours « sur mesure » : questionnaire → fiche de poste → devis (relu et
 * envoyé par le back-office) → acceptation en ligne → mission + facture.
 */

test("questionnaire → devis envoyé → acceptation horodatée → mission + facture", async ({
  page,
  api,
}) => {
  const email = uniqueEmail("sm");

  // 1-2. Questionnaire anonyme → fiche de poste → envoi (génère le devis)
  const quoteNumber = await submitAssessment(api, email);
  expect(quoteNumber).toMatch(/^DEV-\d{4}-\d+$/);

  // 3. Back-office : le devis est relu puis ENVOYÉ (jamais automatique)
  await staffSendsQuote(api, quoteNumber);
  const staff = await apiLogin(api, "staff@tando.fr");

  // 4. Le client ouvre son devis (lien reçu par email) et l'accepte EN LIGNE
  const token = await quoteTokenFromMail(api, email, quoteNumber);
  await page.goto(`/devis/${quoteNumber}?token=${token}`);
  await expect(page.getByRole("heading", { name: /l'employé qu'on vous prépare/i })).toBeVisible();

  await page.getByLabel(/votre nom/i).fill("Camille Test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /j'accepte/i }).click();
  await expect(page.getByRole("heading", { name: /c'est accepté/i })).toBeVisible();

  // 5. L'acceptation est horodatée (date conservée comme preuve)
  const view = await api.get(`${API}/quotes/${quoteNumber}?token=${token}`);
  const publicQuote = (await view.json()) as { status: string; acceptedAt: string | null };
  expect(publicQuote.status).toBe("accepte");
  expect(publicQuote.acceptedAt, "acceptedAt horodaté").toBeTruthy();

  // 6. Une mission a_preparer a été créée automatiquement
  const missions = await api.get(`${API}/admin/missions?status=a_preparer`, {
    headers: staff.headers,
  });
  const missionList = (await missions.json()).missions as Array<{ quoteNumber: string }>;
  expect(
    missionList.some((m) => m.quoteNumber === quoteNumber),
    `mission liée à ${quoteNumber}`,
  ).toBeTruthy();

  // 7. Une facture de mise en service a été émise pour le nouveau client
  const owner = await apiLogin(api, email);
  const docs = await api.get(`${API}/me/documents`, { headers: owner.headers });
  const bundle = await docs.json();
  const invoices = bundle.invoices ?? bundle.documents ?? [];
  expect(Array.isArray(invoices) && invoices.length >= 1, "au moins une facture").toBeTruthy();
  expect(JSON.stringify(invoices)).toMatch(/FAC-\d{4}-\d+/);
});
