import type { OutgoingMail } from "../mail/mail.service";

const shell = (bodyHtml: string) => `<!doctype html><html lang="fr"><body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; color:#1c1a17; line-height:1.5;">${bodyHtml}<p style="margin-top:24px;">— Tando</p></body></html>`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block; background:#26714b; color:#fff; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">${label}</a></p>`;

/** Lien pour reprendre le questionnaire plus tard (§4.1). */
export function resumeAssessmentEmail(to: string, link: string): OutgoingMail {
  return {
    to,
    subject: "Reprenez la description de votre besoin",
    text: `Bonjour,\n\nVoici votre lien pour reprendre là où vous en étiez :\n${link}\n\nVos réponses sont enregistrées au fur et à mesure.\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Voici votre lien pour reprendre la description de votre besoin, là où vous en étiez :</p>${button(link, "Reprendre où j'en étais")}<p style="color:#6b665c; font-size:14px;">Vos réponses sont enregistrées au fur et à mesure.</p>`,
    ),
  };
}

/** Le devis est prêt et envoyé par l'admin (§4.2). */
export function quoteSentEmail(to: string, number: string, link: string): OutgoingMail {
  return {
    to,
    subject: `Votre devis ${number} est prêt`,
    text: `Bonjour,\n\nVotre devis ${number} est prêt. Vous pouvez le consulter et l'accepter en ligne ici :\n${link}\n\nIl est valable 30 jours.\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Votre devis <strong>${number}</strong> est prêt. Vous pouvez le consulter en détail et l'accepter en ligne :</p>${button(link, "Voir mon devis")}<p style="color:#6b665c; font-size:14px;">Il est valable 30 jours.</p>`,
    ),
  };
}

/** Relance J+7 / J+21 (§4.2). */
export function quoteReminderEmail(to: string, number: string, link: string): OutgoingMail {
  return {
    to,
    subject: `Votre devis ${number} vous attend`,
    text: `Bonjour,\n\nPetit rappel : votre devis ${number} est toujours disponible.\n${link}\n\nUne question ? Répondez simplement à cet email.\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Petit rappel : votre devis <strong>${number}</strong> est toujours disponible.</p>${button(link, "Voir mon devis")}<p style="color:#6b665c; font-size:14px;">Une question ? Répondez simplement à cet email.</p>`,
    ),
  };
}

/** Confirmation d'acceptation (§4.3). */
export function quoteAcceptedEmail(to: string, number: string): OutgoingMail {
  return {
    to,
    subject: `Devis ${number} accepté — on prépare votre employé virtuel`,
    text: `Bonjour,\n\nMerci ! Votre devis ${number} est accepté. On commence tout de suite à préparer votre employé virtuel. Vous recevrez un email dès qu'il aura pris son poste.\n\n— Tando`,
    html: shell(
      `<p>Bonjour,</p><p>Merci ! Votre devis <strong>${number}</strong> est accepté. On commence tout de suite à préparer votre employé virtuel.</p><p>Vous recevrez un email dès qu'il aura pris son poste.</p>`,
    ),
  };
}
