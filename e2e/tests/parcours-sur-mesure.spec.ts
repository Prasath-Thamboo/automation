import { test, expect, apiLogin, uniqueEmail } from "../fixtures/tando";
import { MAILPIT_URL } from "../fixtures/tando";
import type { APIRequestContext } from "@playwright/test";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * Critères d'acceptation §11 :
 * « Un devis accepté génère automatiquement une mission et une facture, sans
 *   intervention manuelle. » + acceptation en ligne horodatée.
 *
 * Parcours « sur mesure » : questionnaire → fiche de poste → devis (relu et
 * envoyé par le back-office) → acceptation en ligne → mission + facture.
 */

/** Récupère le lien du devis (`/devis/<number>?token=`) dans le mail « devis prêt ». */
async function quoteLinkFromMail(
  api: APIRequestContext,
  email: string,
  number: string,
): Promise<{ token: string }> {
  for (let i = 0; i < 40; i++) {
    const list = await api.get(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    const { messages = [] } = (await list.json()) as {
      messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }>;
    };
    const hit = messages.find(
      (m) =>
        m.Subject?.includes(number) &&
        (m.To ?? []).some((t) => t.Address.toLowerCase() === email.toLowerCase()),
    );
    if (hit) {
      const raw = await (await api.get(`${MAILPIT_URL}/api/v1/message/${hit.ID}`)).json();
      const body = `${raw.HTML ?? ""} ${raw.Text ?? ""}`.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
      const m = body.match(/[?&]token=([A-Za-z0-9_\-.]+)/);
      if (m?.[1]) return { token: m[1] };
      throw new Error(`Mail « devis ${number} » sans jeton.`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Pas de mail « devis ${number} » pour ${email}.`);
}

test("questionnaire → devis envoyé → acceptation horodatée → mission + facture", async ({
  page,
  api,
}) => {
  const email = uniqueEmail("sm");

  // 1. Questionnaire (anonyme, jeton de reprise)
  const start = await api.post(`${API}/assessments`, { data: { email } });
  expect(start.ok(), "POST /assessments").toBeTruthy();
  const { resumeToken } = (await start.json()) as { resumeToken: string };
  const anon = { headers: { Authorization: `Bearer ${resumeToken}` } };

  const patch = await api.patch(`${API}/assessments/current`, {
    ...anon,
    data: {
      answers: {
        entreprise: "Resto E2E",
        nom: "Camille Test",
        secteur: "restaurant",
        taches: ["reserver", "questions"],
        canaux: ["telephone", "email"],
        agenda: "google",
        heures: "ouverture",
        ton: "chaleureux",
      },
    },
  });
  expect(patch.ok(), "PATCH /assessments/current").toBeTruthy();

  // 2. Fiche de poste proposée, puis envoi (fige la fiche + génère le devis)
  const preview = await api.get(`${API}/assessments/current/preview`, anon);
  expect(preview.ok(), "preview").toBeTruthy();
  const jobDescription = await preview.json();

  const submit = await api.post(`${API}/assessments/current/submit`, {
    ...anon,
    data: { jobDescription },
  });
  expect(submit.ok(), "submit").toBeTruthy();
  const { quoteNumber } = (await submit.json()) as { quoteNumber: string };
  expect(quoteNumber).toMatch(/^DEV-\d{4}-\d+$/);

  // 3. Back-office : le devis est relu puis ENVOYÉ (jamais automatique)
  const staff = await apiLogin(api, "staff@tando.fr");
  const quotes = await api.get(`${API}/admin/quotes`, { headers: staff.headers });
  const list = (await quotes.json()).quotes as Array<{ id: string; number: string; status: string }>;
  const quote = list.find((q) => q.number === quoteNumber);
  expect(quote, `devis ${quoteNumber} dans le back-office`).toBeTruthy();

  const send = await api.post(`${API}/admin/quotes/${quote!.id}/send`, { headers: staff.headers });
  expect(send.ok(), "POST /admin/quotes/:id/send").toBeTruthy();

  // 4. Le client ouvre son devis (lien reçu par email) et l'accepte EN LIGNE
  const { token } = await quoteLinkFromMail(api, email, quoteNumber);
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
