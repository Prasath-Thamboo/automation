import {
  test,
  expect,
  hireViaQuote,
  uniqueEmail,
  webLogin,
  API_URL,
  MAILPIT_URL,
  staffLogin,
} from "../fixtures/tando";

const API = `${API_URL}/api/v1`;

/**
 * Lot 15 — « Une question ? ». Le patron pose une question : réponse de la base
 * si elle est sûre ; sinon transmission à l'équipe Tando, qui répond depuis le
 * back-office (réponse visible dans l'espace + email).
 */
test("réponse toute prête dans l'espace client", async ({ page, api }) => {
  const email = uniqueEmail("aide");
  await hireViaQuote(api, email);
  await webLogin(page, api, email);

  await page.goto("/mon-equipe/aide");
  await expect(page.getByRole("heading", { level: 1, name: "Une question ?" })).toBeVisible();
  await page.getByTestId("help-question").fill("Où trouver mes factures ?");
  await page.getByRole("button", { name: "Poser ma question" }).click();
  await expect(page.getByText("Toutes vos factures et vos avoirs sont dans")).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir mes documents/ })).toBeVisible();
  await page.getByRole("button", { name: "Oui, merci" }).click();
  await expect(page.getByText("Merci pour votre retour.")).toBeVisible();
});

test("question sans réponse → transmise → l'équipe répond", async ({ api }) => {
  const email = uniqueEmail("aide-transmise");
  const { session } = await hireViaQuote(api, email);

  // Hors base : pas de réponse inventée
  const asked = await api.post(`${API}/me/help/ask`, {
    headers: session.headers,
    data: { question: "Quelle est la capitale de l'Australie ?" },
  });
  expect(asked.ok()).toBeTruthy();
  const { request } = await asked.json();
  expect(request).toMatchObject({ status: "sans_reponse", answer: null });

  // Une autre organisation ne peut pas y toucher
  const { session: other } = await hireViaQuote(api, uniqueEmail("aide-intrus"));
  const intrus = await api.post(`${API}/me/help/requests/${request.id}/transmit`, {
    headers: other.headers,
  });
  expect(intrus.status()).toBe(404);

  const sent = await api.post(`${API}/me/help/requests/${request.id}/transmit`, {
    headers: session.headers,
  });
  expect((await sent.json()).status).toBe("transmise");

  // Back-office : la question apparaît, le client ne peut pas y accéder
  const forbidden = await api.get(`${API}/admin/help/requests`, { headers: session.headers });
  expect(forbidden.status()).toBe(403);
  const staff = await staffLogin(api);
  const list = await api.get(`${API}/admin/help/requests?status=transmise`, { headers: staff.headers });
  const { requests } = await list.json();
  expect(requests.map((r: { id: string }) => r.id)).toContain(request.id);

  const answered = await api.post(`${API}/admin/help/requests/${request.id}/answer`, {
    headers: staff.headers,
    data: { answer: "Canberra ! Et pour votre employé, nous restons à votre écoute." },
  });
  expect(answered.ok()).toBeTruthy();

  // Visible dans l'espace du client
  const home = await api.get(`${API}/me/help`, { headers: session.headers });
  const item = (await home.json()).history.find((h: { id: string }) => h.id === request.id);
  expect(item).toMatchObject({ status: "traitee", answer: expect.stringContaining("Canberra") });

  // Et par email
  await expect
    .poll(async () => {
      const res = await api.get(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
      const { messages } = (await res.json()) as { messages: Array<{ Subject: string }> };
      return messages.some((m) => m.Subject.includes("a répondu à votre question"));
    })
    .toBe(true);
});
