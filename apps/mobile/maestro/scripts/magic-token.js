// Demande un lien magique (canal "mobile") et récupère le jeton via Mailpit.
// Exécuté par Maestro (`runScript`). Expose `output.magicToken`.
//
// Env : MAESTRO_API_URL, MAESTRO_MAILPIT_URL, MAESTRO_TEST_EMAIL

const api = MAESTRO_API_URL || "http://10.0.2.2:3333";
const mailpit = MAESTRO_MAILPIT_URL || "http://10.0.2.2:8025";
const email = MAESTRO_TEST_EMAIL || "e2e-mobile@tando.local";

const before = json(
  http.get(mailpit + "/api/v1/messages?limit=50"),
).messages.filter((m) => (m.To || []).some((t) => t.Address.toLowerCase() === email.toLowerCase()))
  .map((m) => m.ID);

const res = http.post(api + "/api/v1/auth/magic-link", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: email, channel: "mobile" }),
});
if (res.status < 200 || res.status >= 300) {
  throw "magic-link a échoué : HTTP " + res.status;
}

let token = null;
for (let i = 0; i < 40 && !token; i++) {
  const list = json(http.get(mailpit + "/api/v1/messages?limit=50")).messages;
  const fresh = list.find(
    (m) =>
      before.indexOf(m.ID) === -1 &&
      (m.To || []).some((t) => t.Address.toLowerCase() === email.toLowerCase()),
  );
  if (fresh) {
    const raw = json(http.get(mailpit + "/api/v1/message/" + fresh.ID));
    const body = ((raw.HTML || "") + " " + (raw.Text || ""))
      .replace(/=\r?\n/g, "")
      .replace(/=3D/g, "=");
    const m = body.match(/[?&]token=([A-Za-z0-9_\-.]+)/);
    if (m) token = m[1];
  }
  if (!token) {
    // petite attente
    http.get(mailpit + "/api/v1/messages?limit=1");
  }
}

if (!token) throw "aucun lien magique reçu pour " + email;
output.magicToken = token;
