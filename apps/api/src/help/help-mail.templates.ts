import type { OutgoingMail } from "../mail/mail.service";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const shell = (b: string) =>
  `<!doctype html><html lang="fr"><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1a17;line-height:1.5;">${b}<p style="margin-top:24px;">— Velekya</p></body></html>`;
const quote = (s: string) =>
  `<blockquote style="margin:12px 0;padding:8px 14px;border-left:4px solid #26714b;background:#f4f1ea;white-space:pre-wrap;">${esc(s)}</blockquote>`;

/** Interne : une question transmise à l'équipe Velekya (vocabulaire technique admis). */
export function helpTransmittedEmail(
  to: string,
  input: { organizationName: string; askedBy: string; question: string; adminUrl: string },
): OutgoingMail {
  return {
    to,
    replyTo: input.askedBy,
    subject: `[Aide] Question de ${input.organizationName}`,
    text: `${input.askedBy} (${input.organizationName}) a transmis une question :\n\n${input.question}\n\nRépondre depuis le back-office : ${input.adminUrl}`,
    html: shell(
      `<p><strong>${esc(input.askedBy)}</strong> (${esc(input.organizationName)}) a transmis une question :</p>${quote(input.question)}<p><a href="${input.adminUrl}">Répondre depuis le back-office</a></p>`,
    ),
  };
}

/** Client : l'équipe Velekya a répondu à sa question (vocabulaire §2). */
export function helpAnsweredEmail(
  to: string,
  input: { question: string; answer: string; link: string },
): OutgoingMail {
  return {
    to,
    subject: "L'équipe Velekya a répondu à votre question",
    text: `Bonjour,\n\nVous nous avez demandé :\n${input.question}\n\nNotre réponse :\n${input.answer}\n\nRetrouvez-la dans votre espace : ${input.link}\n\n— Velekya`,
    html: shell(
      `<p>Bonjour,</p><p>Vous nous avez demandé :</p>${quote(input.question)}<p>Notre réponse :</p>${quote(input.answer)}<p><a href="${input.link}">Retrouver la réponse dans mon espace</a></p>`,
    ),
  };
}
