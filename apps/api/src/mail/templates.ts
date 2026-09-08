import type { OutgoingMail } from "./mail.service";

/**
 * Gabarit de l'email de lien magique. Vocabulaire client (§2) : on parle de
 * « connexion à votre espace », jamais de « token » ni d'« authentification ».
 */
export function magicLinkEmail(to: string, link: string, ttlMinutes: number): OutgoingMail {
  const subject = "Votre lien pour entrer dans votre espace Tando";
  const text = [
    "Bonjour,",
    "",
    "Voici votre lien pour vous connecter à votre espace Tando :",
    link,
    "",
    `Ce lien est valable ${ttlMinutes} minutes et ne fonctionne qu'une fois.`,
    "Si vous n'avez rien demandé, vous pouvez ignorer cet email.",
    "",
    "— Tando",
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr"><body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #1c1a17; line-height: 1.5;">
  <p>Bonjour,</p>
  <p>Voici votre lien pour vous connecter à votre espace Tando :</p>
  <p><a href="${link}" style="display:inline-block; background:#26714b; color:#fff; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">Ouvrir mon espace</a></p>
  <p style="color:#6b665c; font-size:14px;">Ce lien est valable ${ttlMinutes} minutes et ne fonctionne qu'une fois. Si vous n'avez rien demandé, ignorez cet email.</p>
  <p>— Tando</p>
</body></html>`;

  return { to, subject, html, text };
}
