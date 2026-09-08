/**
 * Pages légales — mentions légales, conditions générales, politique de
 * confidentialité, cookies.
 *
 * PROVISOIRE : les informations d'identité de l'éditeur (raison sociale, SIREN,
 * siège, hébergeur…) sont des marqueurs « [À COMPLÉTER] ». Ne rien inventer
 * (§12) : ces champs doivent être renseignés avant toute mise en ligne réelle.
 *
 * `lastUpdated` : à mettre à jour à chaque modification de fond.
 */

export interface LegalSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalPage {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
}

const TODO = "[À COMPLÉTER]";

export const legalIdentity = {
  publisher: TODO, // raison sociale
  legalForm: TODO, // forme juridique
  capital: TODO, // capital social
  siren: TODO,
  rcs: TODO,
  vatNumber: TODO, // TVA intracommunautaire
  headOffice: TODO, // adresse du siège
  publicationDirector: TODO, // directeur de la publication
  contactEmail: "bonjour@tando.fr",
  host: {
    name: TODO,
    address: TODO,
  },
  dpoEmail: "confidentialite@tando.fr",
} as const;

export const mentionsLegales: LegalPage = {
  title: "Mentions légales",
  intro:
    "Informations sur l'éditeur du site et l'hébergeur, conformément à la loi pour la confiance dans l'économie numérique.",
  lastUpdated: "2026-09-08",
  sections: [
    {
      heading: "Éditeur du site",
      paragraphs: [
        `Le site tando.fr est édité par ${legalIdentity.publisher}, ${legalIdentity.legalForm} au capital de ${legalIdentity.capital}, dont le siège social est situé ${legalIdentity.headOffice}.`,
        `Immatriculée au registre du commerce et des sociétés sous le numéro ${legalIdentity.siren} (${legalIdentity.rcs}). Numéro de TVA intracommunautaire : ${legalIdentity.vatNumber}.`,
        `Directeur de la publication : ${legalIdentity.publicationDirector}. Contact : ${legalIdentity.contactEmail}.`,
      ],
    },
    {
      heading: "Hébergement",
      paragraphs: [
        `Le site et les données sont hébergés dans l'Union européenne par ${legalIdentity.host.name}, ${legalIdentity.host.address}.`,
        "Les données personnelles ne sont jamais transférées en dehors de l'Union européenne.",
      ],
    },
    {
      heading: "Propriété intellectuelle",
      paragraphs: [
        "L'ensemble des contenus de ce site (textes, visuels, mise en forme) est protégé. Toute reproduction sans autorisation est interdite.",
      ],
    },
    {
      heading: "Nous joindre",
      paragraphs: [
        `Pour toute question sur le site ou son contenu, écrivez à ${legalIdentity.contactEmail}. Un bouton « Parler à un humain » est également disponible sur chaque page.`,
      ],
    },
  ],
};

export const conditionsGenerales: LegalPage = {
  title: "Conditions générales",
  intro:
    "Ces conditions encadrent la préparation et la mise à disposition d'un employé virtuel, que vous choisissiez une formule prête à l'emploi ou sur mesure.",
  lastUpdated: "2026-09-08",
  sections: [
    {
      heading: "Objet",
      paragraphs: [
        "Tando prépare, met à disposition et entretient pour votre entreprise un assistant qui répond à vos clients, prend des rendez-vous et gère des demandes courantes selon la fiche de poste convenue avec vous.",
        "Le périmètre exact — ce que l'assistant sait faire, ce qu'il ne fait pas — figure sur votre devis ou sur la fiche de la formule choisie.",
      ],
    },
    {
      heading: "Souscription et devis",
      paragraphs: [
        "Pour une formule prête à l'emploi, le contrat prend effet à la souscription en ligne. Pour un assistant sur mesure, il prend effet à l'acceptation du devis, horodatée et conservée à titre de preuve.",
        "Le devis précise les frais de mise en service, l'abonnement mensuel, le délai de mise en service et ce qui est explicitement hors périmètre.",
      ],
    },
    {
      heading: "Prix et paiement",
      paragraphs: [
        "Les prix affichés sont mensuels et toutes taxes comprises. Le paiement s'effectue par carte bancaire ou prélèvement, à la souscription puis chaque mois.",
        "Les factures sont numérotées de façon séquentielle et ne sont jamais modifiées après émission : une erreur est corrigée par un avoir.",
      ],
    },
    {
      heading: "Durée et résiliation",
      paragraphs: [
        "L'abonnement est sans engagement de durée. Vous pouvez résilier à tout moment depuis votre espace, en un clic, sans pénalité ni préavis. Le service reste actif jusqu'à la fin de la période déjà payée.",
        "Après résiliation, vos données restent exportables pendant 30 jours, puis elles sont supprimées.",
      ],
    },
    {
      heading: "Engagements de Tando",
      paragraphs: [
        "Nous mettons tout en œuvre pour que votre assistant soit disponible en continu. En cas d'incident, nous vous informons et nous rétablissons le service au plus vite.",
        "Votre assistant ne prétend jamais être un humain lorsqu'un client le lui demande, et il transmet à votre équipe tout ce dont il n'est pas sûr.",
      ],
    },
    {
      heading: "Vos engagements",
      paragraphs: [
        "Vous fournissez des informations exactes sur votre activité et vous n'utilisez pas le service à des fins illicites. Vous restez responsable des réponses que votre assistant apporte dans le cadre de la fiche de poste que vous avez validée.",
      ],
    },
    {
      heading: "Responsabilité",
      paragraphs: [
        "La responsabilité de Tando est limitée aux sommes versées au titre des trois derniers mois. Nous ne sommes pas responsables des conséquences d'informations erronées que vous nous auriez transmises.",
      ],
    },
    {
      heading: "Médiation",
      paragraphs: [
        `En cas de litige non résolu, vous pouvez recourir gratuitement à un médiateur de la consommation : ${TODO}.`,
      ],
    },
  ],
};

export const politiqueConfidentialite: LegalPage = {
  title: "Politique de confidentialité",
  intro:
    "Comment nous traitons vos données et celles de vos clients, et comment exercer vos droits.",
  lastUpdated: "2026-09-08",
  sections: [
    {
      heading: "Responsable du traitement",
      paragraphs: [
        `${legalIdentity.publisher} est responsable du traitement des données collectées via tando.fr et l'application. Délégué à la protection des données : ${legalIdentity.dpoEmail}.`,
      ],
    },
    {
      heading: "Données que nous traitons",
      paragraphs: [
        "Pour votre compte : votre nom, votre adresse email, votre numéro de téléphone, les informations sur votre établissement et votre moyen de paiement.",
        "Pour le fonctionnement de votre assistant : les échanges avec vos clients (messages, demandes, rendez-vous) et les consignes que vous ajoutez.",
        "Techniques : journaux de connexion, strictement nécessaires à la sécurité, sans contenu personnel en clair.",
      ],
    },
    {
      heading: "Pourquoi nous les traitons",
      paragraphs: [
        "Pour créer et faire fonctionner votre assistant, vous facturer, assurer la sécurité du service et répondre à vos demandes de support.",
        "Nous n'utilisons jamais vos données ou celles de vos clients pour autre chose. Elles ne sont ni vendues, ni cédées, ni utilisées à des fins publicitaires.",
      ],
    },
    {
      heading: "Où sont hébergées vos données",
      paragraphs: [
        "En France, chez un hébergeur français. Aucune donnée personnelle n'est transférée en dehors de l'Union européenne.",
        "Les données personnelles sensibles sont chiffrées au repos, et tous les échanges sont chiffrés en transit.",
      ],
    },
    {
      heading: "Combien de temps nous les gardons",
      paragraphs: [
        "Tant que votre contrat est actif. Après résiliation : 30 jours pour l'export, puis suppression. Les documents comptables sont conservés le temps imposé par la loi.",
      ],
    },
    {
      heading: "Vos droits",
      paragraphs: [
        "Vous pouvez consulter, corriger, exporter ou supprimer vos données directement depuis votre espace, dans « Mon compte » — pas besoin de nous écrire.",
        `Pour toute question, contactez ${legalIdentity.dpoEmail}. Vous pouvez aussi saisir la CNIL.`,
      ],
    },
    {
      heading: "Sous-traitants",
      paragraphs: [
        "Nous faisons appel à des prestataires pour l'hébergement, l'envoi des emails et le paiement. Chacun est encadré par un contrat conforme au RGPD et n'accède qu'aux données strictement nécessaires.",
      ],
    },
  ],
};

export const cookiesCopy = {
  title: "Cookies",
  intro:
    "Nous n'utilisons que des cookies strictement nécessaires au fonctionnement du site (votre session, votre choix d'affichage). Ils ne servent pas à vous suivre.",
  banner: {
    text: "Ce site utilise uniquement des cookies nécessaires à son bon fonctionnement. Si nous ajoutons un jour des mesures d'audience, vous pourrez les refuser ici, aussi simplement que les accepter.",
    accept: "Tout accepter",
    reject: "Tout refuser",
    manage: "En savoir plus",
  },
  sections: [
    {
      heading: "Cookies nécessaires",
      paragraphs: [
        "Ils permettent de vous garder connecté et de mémoriser vos préférences d'affichage. Sans eux, le site ne peut pas fonctionner. Ils ne nécessitent pas votre consentement.",
      ],
    },
    {
      heading: "Mesure d'audience",
      paragraphs: [
        "Nous n'en utilisons pas aujourd'hui. Si cela change, un bandeau vous permettra de refuser d'un seul clic, et ce choix sera respecté sur toutes vos visites.",
      ],
    },
  ],
} as const;
