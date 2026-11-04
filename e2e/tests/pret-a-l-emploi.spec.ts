import {
  test,
  expect,
  apiLogin,
  uniqueEmail,
  webLogin,
  API_URL,
  staffLogin,
} from "../fixtures/tando";

const API = `${API_URL}/api/v1`;
const N8N_TOKEN = process.env.N8N_TOKEN ?? "dev-n8n-token";
const DAY = 24 * 60 * 60 * 1000;

/**
 * Lot 16 — employé « prêt à l'emploi » générique : souscription en libre-service
 * avec essai gratuit, boutons par défaut du métier, flux n8n partagé par métier.
 */
test("souscription en libre-service depuis la fiche → premier jour, essai gratuit", async ({ page, api }) => {
  const email = uniqueEmail("pret");
  await webLogin(page, api, email);

  await page.goto("/employes-virtuels/salon-de-coiffure");
  await page.getByRole("link", { name: /jours gratuitement/ }).first().click();
  await expect(page).toHaveURL(/\/souscrire$/);
  await expect(page.getByText(/jours d'essai gratuit/)).toBeVisible();
  await page.getByTestId("subscribe").click();
  await expect(page).toHaveURL(/\/premier-jour$/);

  // Contrat actif, en essai, sans facture
  const session = await apiLogin(api, email);
  const docs = await (await api.get(`${API}/me/documents`, { headers: session.headers })).json();
  expect(docs.subscription).toMatchObject({ status: "active", formula: "pret-a-l-emploi", setupEur: 0 });
  const trialMs = Date.parse(docs.subscription.trialEndsAt) - Date.now();
  expect(trialMs).toBeGreaterThan(13 * DAY);
  expect(trialMs).toBeLessThan(15 * DAY);
  expect(docs.invoices).toHaveLength(0);

  // Un second clic renvoie le même employé ; un autre métier est refusé (un contrat à la fois)
  const again = await api.post(`${API}/me/catalog/subscribe`, {
    headers: session.headers,
    data: { slug: "salon-de-coiffure" },
  });
  expect(again.ok()).toBeTruthy();
  const other = await api.post(`${API}/me/catalog/subscribe`, {
    headers: session.headers,
    data: { slug: "garagiste" },
  });
  expect(other.status()).toBe(409);
  const team = await (await api.get(`${API}/me/team`, { headers: session.headers })).json();
  expect(team.assistants).toHaveLength(1);
});

test("flux générique du métier : boutons par défaut + liste pour les flux planifiés", async ({ api }) => {
  const staff = await staffLogin(api);
  const { professions } = await (await api.get(`${API}/admin/catalog/professions`, { headers: staff.headers })).json();
  const artisan = professions.find((p: { slug: string }) => p.slug === "artisan-batiment");
  expect(artisan).toBeTruthy();

  const set = await api.patch(`${API}/admin/professions/${artisan.id}/workflow`, {
    headers: staff.headers,
    data: {
      workflowUrl: "http://localhost:5678/webhook/metier-artisan",
      defaultSwitches: [
        { key: "relance_devis", label: "Il relance les devis sans réponse", enabled: true },
      ],
    },
  });
  expect(set.ok(), "branchement du flux générique").toBeTruthy();

  const email = uniqueEmail("pret-artisan");
  const session = await apiLogin(api, email);
  const sub = await api.post(`${API}/me/catalog/subscribe`, {
    headers: session.headers,
    data: { slug: "artisan-batiment" },
  });
  expect(sub.ok()).toBeTruthy();
  const { assistantId } = await sub.json();

  // Bouton par défaut créé pour ce client
  const detail = await (await api.get(`${API}/me/assistants/${assistantId}`, { headers: session.headers })).json();
  expect(detail.switches).toEqual([
    expect.objectContaining({ key: "relance_devis", enabled: true }),
  ]);

  // Le flux planifié partagé le voit (jeton requis)
  const denied = await api.get(`${API}/n8n/professions/artisan-batiment/assistants`);
  expect(denied.status()).toBe(403);
  const list = await (
    await api.get(`${API}/n8n/professions/artisan-batiment/assistants`, {
      headers: { "x-tando-token": N8N_TOKEN },
    })
  ).json();
  expect(list.assistants.map((a: { assistantId: string }) => a.assistantId)).toContain(assistantId);

  // Remise à zéro pour ne pas influencer les autres tests
  await api.patch(`${API}/admin/professions/${artisan.id}/workflow`, {
    headers: staff.headers,
    data: { workflowUrl: null, defaultSwitches: [] },
  });
});
