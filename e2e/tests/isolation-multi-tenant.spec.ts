import { test, expect, apiLogin, uniqueEmail } from "../fixtures/tando";

const API = `${process.env.API_URL ?? "http://localhost:3333"}/api/v1`;

/**
 * Critère d'acceptation §11 :
 * « Aucune donnée d'une organisation n'est accessible depuis une autre —
 *   prouvé par un test. »
 *
 * Deux utilisateurs = deux organisations (créées à la connexion). L'un souscrit
 * un employé virtuel ; l'autre ne doit jamais pouvoir le lire ni agir dessus.
 */
test("un client ne peut pas accéder à l'employé virtuel d'un autre client", async ({ api }) => {
  const alice = await apiLogin(api, uniqueEmail("alice"));
  const bob = await apiLogin(api, uniqueEmail("bob"));

  expect(alice.user.organizationId).not.toBe(bob.user.organizationId);

  // Alice souscrit → un assistant dans SON organisation
  const sub = await api.post(`${API}/me/catalog/subscribe`, {
    headers: alice.headers,
    data: { slug: "dentiste" },
  });
  expect(sub.ok(), "souscription d'Alice").toBeTruthy();
  const { assistantId } = (await sub.json()) as { assistantId: string };
  expect(assistantId).toBeTruthy();

  // Alice y a accès (sanité)
  const aliceRead = await api.get(`${API}/me/assistants/${assistantId}`, { headers: alice.headers });
  expect(aliceRead.status(), "Alice lit son assistant").toBe(200);

  // Bob : lecture interdite (404/403, jamais 200)
  const bobRead = await api.get(`${API}/me/assistants/${assistantId}`, { headers: bob.headers });
  expect([403, 404], `Bob lit l'assistant d'Alice → ${bobRead.status()}`).toContain(bobRead.status());

  // Bob : action interdite (mise en pause)
  const bobPause = await api.post(`${API}/me/assistants/${assistantId}/pause`, {
    headers: bob.headers,
  });
  expect([403, 404], `Bob met en pause l'assistant d'Alice → ${bobPause.status()}`).toContain(
    bobPause.status(),
  );

  // Bob : son « équipe » ne contient pas l'assistant d'Alice
  const bobTeam = await api.get(`${API}/me/team`, { headers: bob.headers });
  expect(bobTeam.ok()).toBeTruthy();
  const teamJson = JSON.stringify(await bobTeam.json());
  expect(teamJson).not.toContain(assistantId);

  // Bob : le carnet de bord d'Alice lui est fermé
  const bobToday = await api.get(`${API}/me/today`, { headers: bob.headers });
  expect(bobToday.ok()).toBeTruthy();
  expect(JSON.stringify(await bobToday.json())).not.toContain(assistantId);
});

/** Sans session, l'espace client est fermé. */
test("l'espace client refuse les requêtes non authentifiées", async ({ api }) => {
  for (const path of ["/me/team", "/me/today", "/me/account", "/me/notification-preferences"]) {
    const res = await api.get(`${API}${path}`);
    expect([401, 403], `${path} sans jeton → ${res.status()}`).toContain(res.status());
  }
});
