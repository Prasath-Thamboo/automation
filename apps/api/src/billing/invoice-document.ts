import type { InvoiceDoc } from "@tando/types";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const date = (s: string | null) => (s ? new Date(s).toLocaleDateString("fr-FR") : "—");
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const KIND_LABEL: Record<InvoiceDoc["kind"], string> = {
  mise_en_service: "Facture — mise en service",
  abonnement: "Facture — abonnement mensuel",
};
const STATUS_LABEL: Record<InvoiceDoc["status"], string> = {
  emise: "À payer",
  payee: "Payée",
  impayee: "Impayée",
  annulee: "Annulée par avoir",
};

/** Document de facture imprimable, mentions légales françaises complètes (§9.4). */
export function renderInvoiceDocument(inv: InvoiceDoc): string {
  const rows = inv.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.label)}</td><td class="num">${l.quantity}</td><td class="num">${euro(l.unitEur)}</td><td class="num">${euro(l.totalEur)}</td></tr>`,
    )
    .join("");

  const period =
    inv.periodStart && inv.periodEnd
      ? `<p class="muted">Période : du ${date(inv.periodStart)} au ${date(inv.periodEnd)}</p>`
      : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(inv.number)}</title>
<style>
  :root{color-scheme:light}
  body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;color:#1c1a17;line-height:1.5;max-width:760px;margin:40px auto;padding:0 24px}
  h1{font-size:22px;margin:0}
  .grid{display:flex;justify-content:space-between;gap:24px;margin-top:24px}
  .muted{color:#6b665c;font-size:13px;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e7e3da}
  th.num,td.num{text-align:right;white-space:nowrap}
  .totals{margin-top:12px;margin-left:auto;width:280px;font-size:14px}
  .totals div{display:flex;justify-content:space-between;padding:3px 0}
  .totals .ttc{font-size:17px;font-weight:700;border-top:1px solid #1c1a17;margin-top:4px;padding-top:6px}
  .legal{margin-top:28px;font-size:11px;color:#6b665c;border-top:1px solid #e7e3da;padding-top:10px}
  .badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:#eef6f1;color:#1f5c3d}
  @media print{body{margin:0}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:baseline">
    <h1>${esc(KIND_LABEL[inv.kind])}</h1>
    <span class="badge">${STATUS_LABEL[inv.status]}</span>
  </div>
  <p class="muted">N° ${esc(inv.number)} · Émise le ${date(inv.issuedAt)} · Échéance ${date(inv.dueAt)}</p>
  ${period}

  <div class="grid">
    <div>
      <strong>Émetteur</strong>
      <p class="muted">${esc(inv.seller.name)}</p>
      <p class="muted">${esc(inv.seller.address)}</p>
      <p class="muted">${esc(inv.seller.extra)}</p>
    </div>
    <div>
      <strong>Client</strong>
      <p class="muted">${esc(inv.buyer.name)}</p>
      <p class="muted">${esc(inv.buyer.address)}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">P.U. HT</th><th class="num">Total HT</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Total HT</span><span>${euro(inv.subtotalEur)}</span></div>
    <div><span>TVA (${inv.vatRatePct} %)</span><span>${euro(inv.vatEur)}</span></div>
    <div class="ttc"><span>Total TTC</span><span>${euro(inv.totalEur)}</span></div>
  </div>

  <div class="legal">
    <p>Paiement à réception, au plus tard le ${date(inv.dueAt)}. ${esc(inv.legalNotice)}</p>
    <p>${inv.status === "payee" ? `Facture acquittée le ${date(inv.paidAt)}.` : ""}</p>
  </div>
</body></html>`;
}
