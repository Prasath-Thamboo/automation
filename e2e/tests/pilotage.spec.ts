import {
  test,
  expect,
  activateAssistant,
  apiLogin,
  hireViaQuote,
  uniqueEmail,
  webLogin,
  API_URL,
  staffLogin,
} from "../fixtures/tando";

const API = `${API_URL}/api/v1`;
const N8N_TOKEN = process.env.N8N_TOKEN ?? "dev-n8n-token";

/**
 * Lot 14 — un flux n8n par client, piloté par boutons. L'équipe Tando branche
 * le flux et déclare les boutons (back-office) ; le client les actionne ; le
 * flux lit leur état et rend compte dans le carnet de bord.
 */
test("back-office déclare un bouton → le client le bascule → le flux le lit", async ({ page, api }) => {
  const email = uniqueEmail("pilotage");
  const { session, assistantId } = await hireViaQuote(api, email);
  await activateAssistant(api, session, assistantId);

  // 1. Back-office : flux branché + bouton déclaré
  const staff = await staffLogin(api);
  const wf = await api.patch(`${API}/admin/assistants/${assistantId}/setup`, {
    headers: staff.headers,
    data: { workflowUrl: "http://localhost:5678/webhook/e2e-pilotage" },
  });
  expect(wf.ok(), "branchement du flux").toBeTruthy();
  const created = await api.post(`${API}/admin/assistants/${assistantId}/switches`, {
    headers: staff.headers,
    data: { key: "relance_devis", label: "Il relance les devis sans réponse" },
  });
  expect(created.ok(), "création du bouton").toBeTruthy();

  // Une clé en double est refusée
  const dup = await api.post(`${API}/admin/assistants/${assistantId}/switches`, {
    headers: staff.headers,
    data: { key: "relance_devis", label: "Doublon" },
  });
  expect(dup.status()).toBe(409);

  // 2. Le client voit le bouton (coupé) et l'active depuis sa fiche
  await webLogin(page, api, email);
  await page.goto(`/mon-equipe/assistants/${assistantId}`);
  const toggle = page.getByRole("switch", { name: "Il relance les devis sans réponse" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  // 3. Le flux lit l'état (jeton requis)
  const denied = await api.get(`${API}/n8n/assistants/${assistantId}/state`);
  expect(denied.status()).toBe(403);
  const state = await api.get(`${API}/n8n/assistants/${assistantId}/state`, {
    headers: { "x-tando-token": N8N_TOKEN },
  });
  expect(state.ok()).toBeTruthy();
  expect(await state.json()).toMatchObject({ working: true, switches: { relance_devis: true } });

  // 4. Mis en pause par le client → le flux le voit
  await api.post(`${API}/me/assistants/${assistantId}/pause`, { headers: session.headers });
  const paused = await api.get(`${API}/n8n/assistants/${assistantId}/state`, {
    headers: { "x-tando-token": N8N_TOKEN },
  });
  expect((await paused.json()).working).toBe(false);

  // 5. Le flux rend compte → visible dans le carnet de bord
  const report = await api.post(`${API}/n8n/assistants/${assistantId}/activity`, {
    headers: { "x-tando-token": N8N_TOKEN },
    data: { summary: "Il a relancé 2 devis sans réponse." },
  });
  expect(report.ok()).toBeTruthy();
  const detail = await (await api.get(`${API}/me/assistants/${assistantId}`, { headers: session.headers })).json();
  expect(JSON.stringify(detail.logbook)).toContain("Il a relancé 2 devis sans réponse.");

  // 6. Cloisonnement : un autre client ne peut pas actionner ce bouton
  const intrus = await apiLogin(api, uniqueEmail("intrus"));
  const foreign = await api.post(`${API}/me/assistants/${assistantId}/switches/relance_devis`, {
    headers: intrus.headers,
    data: { enabled: false },
  });
  expect([403, 404]).toContain(foreign.status());
});
