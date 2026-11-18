/**
 * Lot 12 — Par où les clients du patron joignent son employé virtuel.
 * Textes de l'espace client (web + mobile) et du formulaire public.
 */

/** Où la conversation a eu lieu — carnet de bord (« au téléphone », « par SMS »…). */
export const channelPlace = {
  telephone: "au téléphone",
  sms: "par SMS",
  whatsapp: "sur WhatsApp",
  email: "par email",
  instagram: "sur Instagram",
  formulaire: "via le formulaire",
  surplace: "sur place",
  autre: "",
} as const;

/** Libellés des canaux dans la section « Comment vos clients le joignent ». */
export const channelLabels = {
  telephone: "Son numéro de téléphone",
  sms: "Son numéro pour les SMS",
  email: "Son adresse email",
  whatsapp: "Son WhatsApp",
  instagram: "Son compte Instagram",
  formulaire: "Le formulaire de votre site",
} as const;

export const channelsCopy = {
  title: "Comment vos clients le joignent",
  intro:
    "Donnez ces coordonnées à vos clients : tout ce qui arrive par là, il le traite et vous en rend compte dans son carnet de bord.",
  pending: "Raccordement en cours par notre équipe",
  copy: "Copier",
  copied: "Copié",
  formTitle: "Sur votre site",
  formIntro:
    "Collez ce code dans votre site à l'endroit où vous voulez que vos visiteurs puissent lui écrire. Vous pouvez aussi simplement mettre un lien vers la page.",
  formOpen: "Voir la page",
  askMore: {
    title: "Vous voulez qu'il réponde aussi au téléphone, par SMS, sur WhatsApp ou sur Instagram ?",
    body: "Écrivez-nous : notre équipe s'occupe du raccordement avec vous, sans rien changer pour vos clients.",
    cta: "Nous écrire",
  },
  /** Premier jour : rappel discret en bas de l'étape « Comment il vous joint ». */
  firstDayHint:
    "Ses coordonnées (adresse email, formulaire pour votre site…) vous attendent sur sa fiche, dès qu'il a commencé.",
} as const;

/** Formulaire public, affiché sur le site du patron. Le visiteur ne connaît pas Velekya. */
export const publicForm = {
  title: (establishment: string) => `Écrivez à ${establishment}`,
  intro: "Posez votre question ou demandez un rendez-vous : on vous répond tout de suite.",
  closed:
    "Nous ne répondons pas en direct pour le moment. Laissez votre message et votre email : nous revenons vers vous.",
  nameLabel: "Votre prénom (facultatif)",
  emailLabel: "Votre email (facultatif)",
  emailHint: "Pour recevoir la réponse si elle demande une vérification.",
  messageLabel: "Votre message",
  messagePlaceholder: "Bonjour, je voudrais…",
  send: "Envoyer",
  sending: "Envoi…",
  you: "Vous",
  received: "Message bien reçu. Nous revenons vers vous dès que possible.",
  receivedWithEmail: "Message bien reçu. Nous vous répondrons par email.",
  error: "Votre message n'est pas parti. Vérifiez votre connexion et réessayez.",
  notFound: "Ce formulaire n'est plus disponible.",
  privacy:
    "Vos informations servent uniquement à répondre à votre demande. Elles ne sont ni revendues ni utilisées à d'autres fins.",
} as const;
