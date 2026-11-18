/**
 * Lot 15 — base d'aide initiale (« Une question ? »). Textes lus par le client :
 * vocabulaire §2 (vérifié par `packages/copy/src/blacklist.test.ts`). L'équipe
 * Velekya les enrichit ensuite depuis le back-office (`/admin/aide`).
 */
export interface HelpArticleSeed {
  slug: string;
  question: string;
  keywords: string[];
  answer: string;
  action: "aucune" | "equipe" | "documents" | "compte" | "reglages" | "carnet";
  position: number;
}

export const helpSeed: HelpArticleSeed[] = [
  {
    slug: "trouver-factures",
    question: "Où trouver mes factures ?",
    keywords: ["facture", "factures", "avoir", "télécharger", "imprimer", "justificatif", "comptable"],
    answer:
      "Toutes vos factures et vos avoirs sont dans « Mes documents ». Chaque facture s'ouvre dans une page que vous pouvez imprimer ou enregistrer pour votre comptable.",
    action: "documents",
    position: 10,
  },
  {
    slug: "payer-facture",
    question: "Comment régler une facture ?",
    keywords: ["payer", "régler", "paiement", "carte bancaire", "à payer", "prélèvement"],
    answer:
      "Dans « Mes documents », les factures à régler ont un bouton « Payer ». Le paiement se fait par carte, sur le site. L'application mobile n'encaisse rien : pour payer, passez par le site.",
    action: "documents",
    position: 20,
  },
  {
    slug: "paiement-refuse",
    question: "Mon paiement n'est pas passé, que faire ?",
    keywords: ["refusé", "échoué", "pas passé", "impayée", "carte expirée", "retard"],
    answer:
      "Ouvrez « Mes documents » et relancez le paiement de la facture marquée « Impayée », avec une autre carte si besoin.",
    action: "documents",
    position: 30,
  },
  {
    slug: "cout-contrat",
    question: "Combien me coûte mon contrat chaque mois ?",
    keywords: ["prix", "tarif", "coût", "mensuel", "abonnement", "contrat", "échéance", "combien"],
    answer:
      "Le montant mensuel et la date de la prochaine échéance sont affichés en haut de « Mes documents » et dans « Mon compte », rubrique contrat.",
    action: "compte",
    position: 40,
  },
  {
    slug: "resilier",
    question: "Comment résilier mon contrat ?",
    keywords: ["résilier", "résiliation", "arrêter", "annuler", "sans engagement", "fin de contrat"],
    answer:
      "Le contrat est sans engagement. Le titulaire du compte peut le résilier depuis « Mon compte », sur le site. Votre employé est alors mis en pause ; vos documents restent consultables.",
    action: "compte",
    position: 50,
  },
  {
    slug: "mettre-en-pause",
    question: "Comment mettre mon employé en pause ?",
    keywords: ["pause", "arrêter", "vacances", "fermeture", "congés", "reprendre", "remettre au travail"],
    answer:
      "Ouvrez sa fiche dans « Mon équipe » et appuyez sur « Le mettre en pause ». Pendant la pause, les messages de vos clients sont gardés et vous sont remontés. Un appui sur « Le remettre au travail » suffit pour reprendre.",
    action: "equipe",
    position: 60,
  },
  {
    slug: "le-former",
    question: "Comment lui apprendre quelque chose de nouveau ?",
    keywords: ["former", "apprendre", "consigne", "consignes", "expliquer", "corriger", "nouveauté"],
    answer:
      "Sur sa fiche, rubrique « Le former », écrivez une consigne comme vous le feriez pour un nouveau collaborateur (« Le parking est derrière le magasin »). Il l'applique dès la conversation suivante. Sur téléphone, vous pouvez même la dicter.",
    action: "equipe",
    position: 70,
  },
  {
    slug: "mauvaise-reponse",
    question: "Il a mal répondu à un client, que faire ?",
    keywords: ["erreur", "trompé", "mauvaise réponse", "mal répondu", "faux", "incorrect"],
    answer:
      "Retrouvez l'échange dans son carnet de bord, puis ajoutez une consigne dans « Le former » pour qu'il réponde juste la prochaine fois. Si l'erreur se répète, transmettez-nous la question : on regarde avec vous.",
    action: "carnet",
    position: 80,
  },
  {
    slug: "horaires",
    question: "Comment changer ses horaires ?",
    keywords: ["horaires", "heures", "ouverture", "fermé", "jours", "planning"],
    answer:
      "Ses horaires se règlent sur sa fiche, rubrique « Ses horaires ». Il donne ces horaires à vos clients quand ils les demandent.",
    action: "equipe",
    position: 90,
  },
  {
    slug: "a-valider",
    question: "Pourquoi me transmet-il certaines demandes ?",
    keywords: ["valider", "à valider", "transmet", "remonte", "pas répondu", "demande"],
    answer:
      "Il ne répond jamais au hasard : une question de prix, une urgence, une demande à vous parler ou une demande qu'il ne connaît pas vous est transmise dans « À valider ». Vous répondez en quelques mots, et votre réponse repart au client par le même moyen.",
    action: "equipe",
    position: 100,
  },
  {
    slug: "carnet-de-bord",
    question: "Où voir ce qu'il a fait ?",
    keywords: ["carnet", "historique", "conversations", "aujourd'hui", "activité", "rendez-vous pris"],
    answer:
      "Son carnet de bord résume chaque échange avec vos clients, et les rendez-vous qu'il a pris sont listés sur sa fiche. Sur téléphone, l'écran « Aujourd'hui » fait le point de la journée.",
    action: "carnet",
    position: 110,
  },
  {
    slug: "missions",
    question: "Comment activer ou couper une de ses missions ?",
    keywords: ["mission", "missions", "activer", "couper", "désactiver", "bouton", "relance"],
    answer:
      "Sur sa fiche, la rubrique « Ce qu'il fait pour vous » liste ses missions. Chacune s'active ou se coupe d'un appui, et le changement compte tout de suite. Pour une nouvelle mission, transmettez-nous votre besoin.",
    action: "equipe",
    position: 120,
  },
  {
    slug: "joindre-par-clients",
    question: "Comment mes clients peuvent-ils le joindre ?",
    keywords: ["joindre", "contacter", "formulaire", "email", "téléphone", "sms", "whatsapp", "instagram", "site"],
    answer:
      "Sa fiche, rubrique « Comment vos clients le joignent », donne son adresse email et le code de son formulaire à copier sur votre site. Pour le téléphone, les SMS, WhatsApp ou Instagram, l'équipe Velekya les branche avec vous : transmettez-nous la demande.",
    action: "equipe",
    position: 130,
  },
  {
    slug: "notifications",
    question: "Comment régler les notifications sur mon téléphone ?",
    keywords: ["notification", "notifications", "alerte", "silence", "nuit", "résumé", "téléphone"],
    answer:
      "Dans l'application mobile, onglet « Mon équipe », puis « Notifications » : choisissez ce qui vous est signalé, l'heure du résumé quotidien et vos heures de silence.",
    action: "reglages",
    position: 140,
  },
  {
    slug: "application-mobile",
    question: "Puis-je le suivre depuis mon téléphone ?",
    keywords: ["téléphone", "mobile", "application", "iphone", "android", "smartphone"],
    answer:
      "Oui. L'application Velekya (iPhone et Android) vous montre ce qu'il a fait aujourd'hui, les demandes à valider, et vous permet de le former à la voix ou de le mettre en pause. Connectez-vous avec la même adresse email.",
    action: "aucune",
    position: 150,
  },
  {
    slug: "export-donnees",
    question: "Comment récupérer mes données ?",
    keywords: ["données", "export", "exporter", "rgpd", "récupérer", "copie"],
    answer:
      "Dans « Mon compte », rubrique données, « Exporter mes données » vous remet une copie complète de ce que nous conservons pour votre entreprise.",
    action: "compte",
    position: 160,
  },
  {
    slug: "supprimer-compte",
    question: "Comment fermer mon compte ?",
    keywords: ["supprimer", "fermer", "suppression", "effacer", "compte"],
    answer:
      "Le titulaire du compte peut le fermer depuis « Mon compte », tout en bas. Une double confirmation vous est demandée. Pensez à exporter vos données avant.",
    action: "compte",
    position: 170,
  },
  {
    slug: "deuxieme-employe",
    question: "Comment embaucher un deuxième employé ?",
    keywords: ["deuxième", "autre employé", "nouvel employé", "embaucher", "second", "ajouter un employé"],
    answer:
      "Transmettez-nous votre besoin ici même en quelques mots : l'équipe Velekya vous prépare une fiche de poste et un devis, comme pour le premier.",
    action: "aucune",
    position: 180,
  },
  {
    slug: "joindre-velekya",
    question: "Comment joindre l'équipe Velekya ?",
    keywords: ["joindre velekya", "équipe velekya", "parler à quelqu'un", "conseiller", "humain", "support", "aide"],
    answer:
      "Posez votre question ici. Si je n'ai pas la réponse, appuyez sur « Transmettre à l'équipe Velekya » : une personne de l'équipe vous répond par email et ici même.",
    action: "aucune",
    position: 190,
  },
];
