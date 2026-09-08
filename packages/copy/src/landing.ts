/**
 * Textes de la page d'accueil — repris du §8 du cahier des charges, quasiment
 * tels quels. Règles d'écriture : le « vous » partout, phrases courtes, aucun
 * superlatif technologique, aucun chiffre inventé, aucun jargon (§2).
 *
 * Le nom « Tando » n'apparaît que dans le hero ici (une fois) ; la barre de
 * navigation et le pied de page le portent aussi, rien de plus.
 */

export const landing = {
  hero: {
    title: "Recrutez un employé qui ne dort jamais.",
    body: "Tando vous prépare un employé virtuel qui répond à vos clients, prend vos rendez-vous et gère vos demandes. 24h/24, 7j/7, week-ends compris. Sans contrat de travail, sans charges, sans arrêt maladie.",
    primaryCta: "Découvrir mon futur employé",
    secondaryCta: "Voir un exemple en 2 minutes",
    note: "Mis au travail en 5 minutes. Sans engagement.",
  },

  problem: {
    title: "Pendant que vous travaillez, votre téléphone travaille contre vous.",
    lines: [
      "Un client appelle pendant le coup de feu : il raccroche et appelle le concurrent.",
      "Un message Instagram arrive à 22h : vous y répondez à 7h, il est trop tard.",
      "Un devis attend une relance depuis trois semaines : vous n'avez jamais eu le temps.",
    ],
    punch: "Ce ne sont pas des petites choses. C'est du chiffre d'affaires qui part ailleurs.",
  },

  solution: {
    title: "Comme une embauche. En beaucoup plus simple.",
    steps: [
      {
        title: "Vous décrivez le poste.",
        body: "Quelques questions simples sur votre métier et ce qui vous prend du temps. Pas de vocabulaire compliqué, promis.",
      },
      {
        title: "On vous le prépare.",
        body: "Soit vous choisissez un employé déjà formé à votre métier, soit on en construit un exactement pour vous. Vous recevez un devis clair avant tout engagement.",
      },
      {
        title: "Il prend son poste.",
        body: "Il répond, il note, il réserve, il relance. Vous le suivez depuis votre téléphone, et vous pouvez le corriger d'un mot.",
      },
    ],
  },

  /** Section « Depuis votre poche ». Les badges des stores ne s'affichent qu'une
   *  fois l'application réellement publiée (§8). */
  pocket: {
    title: "Il travaille. Vous gardez la main, depuis votre poche.",
    body: "Quand il ne sait pas répondre, vous recevez une notification. Vous lisez, vous répondez d'un mot, il reprend le travail. Le reste du temps, il ne vous dérange pas.",
    note: "Application gratuite, incluse. iPhone et Android.",
    storesPublished: false,
  },

  twoPaths: {
    ready: {
      title: "Il existe déjà quelqu'un pour votre métier",
      body: "Dentiste, restaurateur, garagiste, coiffeur, agent immobilier, artisan. On a déjà formé un employé virtuel pour votre métier. Il connaît vos habitudes, vos questions récurrentes, votre rythme.",
      cta: "Voir les employés disponibles",
    },
    custom: {
      title: "Votre besoin est particulier",
      body: "Vous avez une organisation à vous, des outils à vous, des règles à vous. On construit votre employé sur mesure. Vous répondez à quelques questions, vous recevez un devis précis, et vous décidez.",
      cta: "Décrire mon besoin",
    },
  },

  reassurance: {
    title: "Vos questions, nos réponses.",
    items: [
      {
        q: "Et s'il dit une bêtise à un client ?",
        a: "Vous fixez ses limites dès le départ. Ce dont il n'est pas sûr, il ne l'invente pas : il vous le transmet.",
      },
      {
        q: "Je ne suis pas à l'aise avec l'informatique.",
        a: "Vous n'aurez rien à installer. Si vous savez envoyer un message, vous savez le piloter.",
      },
      {
        q: "Mes données ?",
        a: "Elles restent en France, chez un hébergeur français, et ne servent à rien d'autre qu'à vous. Vous pouvez tout exporter ou tout effacer quand vous voulez.",
      },
      {
        q: "Et si je veux arrêter ?",
        a: "Vous arrêtez. Un clic, aucune pénalité, aucun préavis.",
      },
      {
        q: "Il remplace mon secrétariat ?",
        a: "Non. Il prend le travail que personne n'a le temps de faire. Votre équipe garde ce qui a de la valeur : le contact humain.",
      },
    ],
  },

  finalCta: {
    title: "Votre prochain employé est disponible tout de suite.",
    body: "Pas d'entretien, pas de période d'essai, pas de charges. Juste du travail en moins pour vous.",
    cta: "Commencer maintenant",
    note: "Sans carte bancaire.",
  },
} as const;

export type Landing = typeof landing;
