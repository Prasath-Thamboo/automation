import type { OutgoingMail } from "../mail/mail.service";

const shell = (b: string) =>
  `<!doctype html><html lang="fr"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1a17;line-height:1.5;">${b}<p style="margin-top:24px;">— Tando</p></body></html>`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#26714b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">${label}</a></p>`;

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

export function paymentReceivedEmail(
  to: string,
  invoiceNumber: string,
  amountEur: number,
  link: string,
): OutgoingMail {
  return {
    to,
    subject: `Paiement reçu — facture ${invoiceNumber}`,
    text: `Bonjour,\n\nNous avons bien reçu votre paiement de ${euro(amountEur)} pour la facture ${invoiceNumber}.\nVous pouvez la retrouver dans vos documents : ${link}\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Nous avons bien reçu votre paiement de <strong>${euro(amountEur)}</strong> pour la facture <strong>${invoiceNumber}</strong>.</p>${button(link, "Voir mes documents")}`,
    ),
  };
}

export function paymentFailedEmail(
  to: string,
  invoiceNumber: string,
  link: string,
): OutgoingMail {
  return {
    to,
    subject: `Votre paiement n'a pas abouti — facture ${invoiceNumber}`,
    text: `Bonjour,\n\nLe paiement de la facture ${invoiceNumber} n'a pas abouti. Vous pouvez réessayer depuis vos documents : ${link}\n\nBesoin d'aide ? Répondez à cet email.\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Le paiement de la facture <strong>${invoiceNumber}</strong> n'a pas abouti.</p>${button(link, "Réessayer le paiement")}<p style="color:#6b665c;font-size:14px;">Besoin d'aide ? Répondez à cet email.</p>`,
    ),
  };
}
