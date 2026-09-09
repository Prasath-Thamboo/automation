import type { OutgoingMail } from "../mail/mail.service";

const shell = (b: string) =>
  `<!doctype html><html lang="fr"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1a17;line-height:1.5;">${b}<p style="margin-top:24px;">— Tando</p></body></html>`;
const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#26714b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">${label}</a></p>`;

/** L'assistant remonte une demande au patron (§6 « À valider »). */
export function escalationNoticeEmail(to: string, name: string, question: string): OutgoingMail {
  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/mon-equipe`;
  return {
    to,
    subject: `${name} a besoin de vous`,
    text: `Bonjour,\n\n${name} n'a pas voulu répondre seul :\n« ${question} »\n\nRépondez en un mot depuis votre espace, il reprend la main :\n${link}\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p><strong>${name}</strong> n'a pas voulu répondre seul :</p><blockquote style="margin:8px 0;padding-left:12px;border-left:3px solid #d06a30;color:#3d3a34;">${question}</blockquote><p>Répondez en un mot, il reprend la main.</p>${button(link, "Voir ce qu'il attend")}`,
    ),
  };
}
