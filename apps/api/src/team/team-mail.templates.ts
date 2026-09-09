import type { OutgoingMail } from "../mail/mail.service";

const shell = (b: string) =>
  `<!doctype html><html lang="fr"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1a17;line-height:1.5;">${b}<p style="margin-top:24px;">— Tando</p></body></html>`;
const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#26714b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">${label}</a></p>`;

/** L'assistant a pris son poste (§4.3). */
export function assistantReadyEmail(to: string, name: string): OutgoingMail {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/mon-equipe`;
  return {
    to,
    subject: `${name} a pris son poste`,
    text: `Bonjour,\n\n${name} est au travail. Vous pouvez suivre ce qu'il fait, valider ce qu'il vous remonte et le corriger d'un mot depuis votre espace :\n${link}\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p><strong>${name}</strong> est au travail. Vous pouvez suivre ce qu'il fait, valider ce qu'il vous remonte et le corriger d'un mot depuis votre espace.</p>${button(link, "Voir mon équipe")}`,
    ),
  };
}
