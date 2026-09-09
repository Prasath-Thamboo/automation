import type { PublicQuote } from "@tando/types";

/**
 * Document du devis en HTML imprimable (§4.2). Le rendu PDF proprement dit sera
 * branché sur la file `pdf` (durcissement) ; ce document sert de source et
 * s'imprime déjà correctement (« Enregistrer en PDF » du navigateur).
 */
const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

const li = (items: string[]) => items.map((i) => `<li>${escape(i)}</li>`).join("");

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function renderQuoteDocument(q: PublicQuote): string {
  const jd = q.content.jobDescription;
  const lines = q.lines
    .map(
      (l) =>
        `<tr><td>${escape(l.label)}</td><td class="num">${l.setupEur ? euro(l.setupEur) : "—"}</td><td class="num">${l.monthlyEur ? euro(l.monthlyEur) : "—"}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Devis ${escape(q.number)}</title>
<style>
  :root{color-scheme:light}
  body{font-family:"Inter","Segoe UI",system-ui,sans-serif;color:#1c1a17;line-height:1.5;max-width:760px;margin:40px auto;padding:0 24px}
  h1{font-size:24px;margin:0}
  h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #e7e3da;padding-bottom:4px}
  .head{display:flex;justify-content:space-between;align-items:baseline}
  .muted{color:#6b665c;font-size:14px}
  ul{margin:6px 0;padding-left:20px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e7e3da}
  td.num,th.num{text-align:right;white-space:nowrap}
  .totals{margin-top:16px;font-size:15px}
  .totals strong{font-size:20px}
  @media print{body{margin:0}}
</style></head><body>
  <div class="head">
    <h1>Tando</h1>
    <div class="muted">Devis n° ${escape(q.number)}<br>${new Date().toLocaleDateString("fr-FR")}</div>
  </div>
  <p class="muted">Pour ${escape(q.content.company)}${q.content.contactName ? ` — à l'attention de ${escape(q.content.contactName)}` : ""}</p>

  <h2>L'employé qu'on vous prépare</h2>
  <p>${escape(jd.summary)}</p>

  <h2>Ce qu'il fera pour vous</h2>
  <ul>${li(q.content.benefits.length ? q.content.benefits : jd.tasks)}</ul>

  <h2>Là où il répondra</h2>
  <ul>${li(jd.channels)}</ul>

  <h2>Ses horaires</h2>
  <p>${escape(jd.hours)}</p>

  <h2>Ce qui n'est pas prévu dans ce devis</h2>
  <ul>${li(q.content.outOfScope)}</ul>

  <h2>Le détail</h2>
  <table>
    <thead><tr><th>Prestation</th><th class="num">Mise en place</th><th class="num">Par mois</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>

  <div class="totals">
    <p>Frais de mise en service : <strong>${euro(q.setupEur)}</strong></p>
    <p>Abonnement mensuel : <strong>${euro(q.monthlyEur)}</strong> / mois, toutes taxes comprises</p>
    <p class="muted">Durée d'engagement : ${q.engagementMonths > 0 ? `${q.engagementMonths} mois` : "sans engagement"} · Mise en service sous ${q.serviceDelayDays} jours${q.expiresAt ? ` · Devis valable jusqu'au ${new Date(q.expiresAt).toLocaleDateString("fr-FR")}` : ""}</p>
  </div>

  <h2>Conditions</h2>
  <p class="muted">L'acceptation de ce devis vaut acceptation des conditions générales de Tando, disponibles sur tando.fr/cgv. Le prix affiché est mensuel et toutes taxes comprises. La résiliation se fait en un clic, sans préavis ni pénalité.</p>
</body></html>`;
}
