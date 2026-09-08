/**
 * Foire aux questions (§8 « Rassurance », élargie). Ton : le « vous », phrases
 * courtes, honnêteté assumée, aucun jargon (§2). Sert aussi aux données
 * structurées FAQPage pour le référencement.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export const faq: readonly FaqItem[] = [
  {
    q: "Et s'il dit une bêtise à un client ?",
    a: "Vous fixez ses limites dès le départ. Ce dont il n'est pas sûr, il ne l'invente pas : il vous le transmet et attend votre réponse.",
  },
  {
    q: "Je ne suis pas à l'aise avec l'informatique.",
    a: "Vous n'aurez rien à installer. Tout se passe depuis votre téléphone. Si vous savez envoyer un message, vous savez le piloter.",
  },
  {
    q: "Combien de temps avant qu'il soit opérationnel ?",
    a: "Pour un assistant prêt à l'emploi : quelques minutes, le temps de répondre à quatre écrans de questions. Pour un assistant sur mesure : le délai est indiqué sur votre devis, en général une à deux semaines.",
  },
  {
    q: "Je peux l'essayer avant de payer ?",
    a: "Oui, pour les assistants prêts à l'emploi : 14 jours d'essai. Vous testez, et si ça ne vous convient pas, vous n'êtes pas prélevé.",
  },
  {
    q: "Où sont mes données ?",
    a: "En France, chez un hébergeur français. Elles ne servent qu'à faire fonctionner votre assistant, à rien d'autre. Vous pouvez tout exporter ou tout effacer depuis votre espace, quand vous voulez.",
  },
  {
    q: "Qui peut lire les conversations de mes clients ?",
    a: "Vous, et les personnes de votre équipe que vous invitez. Notre équipe n'y accède que si vous nous le demandez pour vous dépanner, et chaque accès est tracé.",
  },
  {
    q: "Et si je veux arrêter ?",
    a: "Vous arrêtez. Un clic depuis votre espace, aucune pénalité, aucun préavis. La résiliation est aussi simple que la souscription.",
  },
  {
    q: "Que se passe-t-il si je dépasse mon nombre de demandes ?",
    a: "Il continue de travailler. On vous prévient et on regarde ensemble s'il faut passer à la formule au-dessus. Rien n'est coupé sans vous prévenir.",
  },
  {
    q: "Il remplace mon secrétariat ?",
    a: "Non. Il prend le travail répétitif que personne n'a le temps de faire. Votre équipe garde ce qui a de la valeur : le contact humain, les cas particuliers, la relation.",
  },
  {
    q: "Je peux parler à quelqu'un ?",
    a: "Oui, quand vous voulez. Un bouton « Parler à un humain » est visible partout, dans le site comme dans l'application.",
  },
] as const;

export const faqCopy = {
  title: "Vos questions, nos réponses.",
  subtitle: "Vous ne trouvez pas votre réponse ? Écrivez-nous, on répond vite.",
} as const;
