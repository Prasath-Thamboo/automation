/**
 * Contenu de départ du catalogue (§5) — les 6 métiers du MVP.
 * Ce fichier n'est qu'une graine : une fois en base, tout se modifie depuis le
 * back-office, sans redéploiement.
 *
 * Le contenu suit `templateContentSchema` (@tando/types). Langage bénéfice,
 * aucun jargon (§2).
 */
import type { TemplateContent } from "@tando/types";

export interface CatalogSeed {
  slug: string;
  name: string;
  sector: string;
  benefit: string;
  needs: string[];
  monthlyPriceEur: number;
  position: number;
  content: TemplateContent;
}

const cancellation =
  "Vous résiliez en un clic depuis votre espace : aucun préavis, aucune pénalité. Le service reste actif jusqu'à la fin du mois déjà réglé.";

export const catalogSeed: CatalogSeed[] = [
  {
    slug: "dentiste",
    name: "Cabinet dentaire",
    sector: "Santé",
    benefit: "Elle prend les rendez-vous, rappelle les patients et filtre les urgences.",
    needs: ["Prendre les rendez-vous", "Répondre au téléphone", "Rappeler les patients"],
    monthlyPriceEur: 89,
    position: 1,
    content: {
      assistantName: "Léa",
      assistantRole: "votre assistante de cabinet dentaire",
      intro:
        "Voici Léa. Elle répond aux patients quand le secrétariat est débordé, prend et déplace les rendez-vous, et vous transmet ce qui sort de l'ordinaire.",
      dayTimeline: [
        { time: "7h30", text: "Elle répond au premier patient qui veut décaler son rendez-vous et lui propose un créneau." },
        { time: "9h15", text: "Un patient appelle pour une rage de dents : elle qualifie l'urgence et vous la signale tout de suite." },
        { time: "12h40", text: "Pendant la pause déjeuner, elle continue de répondre aux messages et note les demandes de devis." },
        { time: "17h00", text: "Elle envoie les rappels de rendez-vous du lendemain par message." },
        { time: "20h30", text: "Un nouveau patient écrit après la fermeture : elle lui donne les horaires et propose un premier rendez-vous." },
      ],
      canDo: [
        "Prendre, déplacer et annuler des rendez-vous dans votre agenda",
        "Répondre aux questions habituelles : horaires, adresse, tarifs de base, parking",
        "Repérer les urgences et vous les transmettre immédiatement",
        "Rappeler les patients la veille de leur rendez-vous",
        "Noter les demandes de devis et de renseignements pour votre équipe",
        "Prendre les coordonnées d'un nouveau patient et proposer un premier créneau",
      ],
      cannotDo: [
        "Donner un diagnostic ou un conseil médical",
        "Confirmer qu'une situation n'est pas une urgence",
        "Communiquer un prix précis pour un soin sans votre validation",
      ],
      demo: {
        intro: "Un patient écrit un dimanche soir. Voici comment Léa répond.",
        messages: [
          { from: "client", text: "Bonjour, j'ai très mal à une dent depuis ce matin, est-ce que je peux passer demain ?" },
          { from: "assistant", text: "Bonjour, je suis désolée pour cette douleur. Je peux vous proposer un créneau demain à 8h30 ou à 14h00. Lequel vous convient le mieux ?" },
          { from: "client", text: "8h30 c'est parfait." },
          { from: "assistant", text: "C'est noté pour demain 8h30. Pouvez-vous me donner votre nom et un numéro où vous joindre ? Je préviens aussi le praticien qu'il s'agit d'une douleur importante." },
          { from: "client", text: "Camille Roy, 06 12 34 56 78." },
          { from: "assistant", text: "Merci Camille. Votre rendez-vous est confirmé pour demain 8h30. Si la douleur devient insupportable cette nuit, contactez le 15." },
        ],
      },
      savings: {
        sliderA: { label: "Patients par jour", min: 5, max: 60, default: 25, minutesEach: 3 },
        sliderB: { label: "Appels par jour", min: 5, max: 80, default: 30, minutesEach: 2 },
        daysPerMonth: 22,
        note: "Estimation indicative, calculée à partir du temps que prend en moyenne chaque appel ou message.",
      },
      contract: {
        included: [
          "Un assistant actif 24h/24, 7j/7",
          "Prise de rendez-vous reliée à votre agenda",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "praticiens", label: "Noms des praticiens", type: "textarea", required: true },
        { key: "types_soins", label: "Types de soins proposés", type: "textarea", required: false },
        { key: "urgences", label: "Acceptez-vous les urgences ?", type: "boolean", required: true },
        {
          key: "logiciel_agenda",
          label: "Votre agenda",
          type: "choice",
          options: ["Google Agenda", "Outlook", "Doctolib", "Agenda papier"],
          required: true,
        },
      ],
    },
  },
  {
    slug: "restaurateur",
    name: "Restaurant",
    sector: "Restauration",
    benefit: "Il prend les réservations et répond aux clients même en plein service.",
    needs: ["Prendre les réservations", "Répondre au téléphone", "Répondre aux questions habituelles"],
    monthlyPriceEur: 89,
    position: 2,
    content: {
      assistantName: "Marco",
      assistantRole: "votre assistant de salle",
      intro:
        "Voici Marco. Il décroche quand le téléphone sonne pendant le coup de feu, prend les réservations et répond aux questions sur la carte et les horaires.",
      dayTimeline: [
        { time: "10h30", text: "Il confirme les réservations du soir et relance celles restées sans réponse." },
        { time: "12h30", text: "En plein service, il prend trois réservations par téléphone pendant que vous êtes en salle." },
        { time: "15h00", text: "Un client demande si vous avez un menu sans gluten : il répond et note la demande pour le soir." },
        { time: "19h45", text: "Une table de 6 annule : il libère le créneau et propose la place à la liste d'attente." },
        { time: "23h30", text: "Un client écrit sur Instagram pour réserver le lendemain midi : il confirme." },
      ],
      canDo: [
        "Prendre, modifier et annuler des réservations",
        "Répondre aux questions sur les horaires, l'adresse, la carte et les allergènes que vous avez renseignés",
        "Gérer une liste d'attente et proposer les tables libérées",
        "Rappeler les clients la veille d'une grande table",
        "Prendre les demandes de privatisation et de groupe pour votre retour",
        "Indiquer si vous êtes complet et proposer un autre créneau",
      ],
      cannotDo: [
        "Accepter un groupe au-delà de la capacité que vous avez fixée",
        "Promettre un plat hors carte sans votre accord",
        "Négocier une remise",
      ],
      demo: {
        intro: "Le téléphone sonne pendant le service. Voici comment Marco répond.",
        messages: [
          { from: "client", text: "Bonjour, vous auriez une table pour 4 ce soir vers 20h ?" },
          { from: "assistant", text: "Bonjour ! Ce soir 20h, il me reste une table pour 4. À quel nom je la réserve ?" },
          { from: "client", text: "Au nom de Durand. On a une personne allergique aux fruits de mer." },
          { from: "assistant", text: "C'est noté : table pour 4 à 20h au nom de Durand, une allergie aux fruits de mer signalée en cuisine. À ce soir !" },
        ],
      },
      savings: {
        sliderA: { label: "Couverts par service", min: 20, max: 200, default: 60, minutesEach: 1 },
        sliderB: { label: "Appels par jour", min: 5, max: 60, default: 20, minutesEach: 3 },
        daysPerMonth: 26,
        note: "Estimation indicative, à partir du temps moyen passé au téléphone et à répondre aux messages.",
      },
      contract: {
        included: [
          "Un assistant actif pendant et hors service",
          "Réservations et liste d'attente",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "capacite", label: "Nombre de couverts", type: "text", required: true },
        { key: "horaires", label: "Jours et horaires de service", type: "textarea", required: true },
        { key: "carte", label: "Lien vers la carte ou description des plats", type: "textarea", required: false },
        { key: "groupes_max", label: "Taille maximale d'un groupe accepté", type: "text", required: true },
      ],
    },
  },
  {
    slug: "garagiste",
    name: "Garage automobile",
    sector: "Automobile",
    benefit: "Il qualifie la panne, propose un créneau et prépare le devis.",
    needs: ["Prendre les rendez-vous", "Qualifier une demande", "Préparer les devis"],
    monthlyPriceEur: 89,
    position: 3,
    content: {
      assistantName: "Karim",
      assistantRole: "votre assistant d'atelier",
      intro:
        "Voici Karim. Il répond aux clients pendant que vous êtes sous un capot, qualifie la panne, propose un créneau et rassemble les éléments du devis.",
      dayTimeline: [
        { time: "8h00", text: "Il traite les demandes reçues pendant la nuit et propose des créneaux pour la semaine." },
        { time: "10h30", text: "Un client décrit un bruit au freinage : il pose les bonnes questions et note tout pour vous." },
        { time: "14h00", text: "Il confirme les rendez-vous du lendemain et rappelle d'apporter la carte grise." },
        { time: "17h30", text: "Après la fermeture, il prend une demande de devis pour un embrayage et prépare la fiche." },
      ],
      canDo: [
        "Prendre des rendez-vous de révision, de réparation et de contrôle",
        "Poser les questions utiles pour qualifier une panne (bruit, voyant, kilométrage)",
        "Rassembler les informations nécessaires à un devis pour votre validation",
        "Rappeler les clients quand leur véhicule est prêt",
        "Répondre aux questions sur les horaires, l'adresse et les documents à apporter",
        "Prévenir un client d'un retard et reprogrammer si besoin",
      ],
      cannotDo: [
        "Donner un diagnostic définitif à distance",
        "Communiquer un prix ferme sans votre validation",
        "S'engager sur un délai de réparation sans votre accord",
      ],
      demo: {
        intro: "Un client appelle pendant que vous travaillez. Voici comment Karim répond.",
        messages: [
          { from: "client", text: "Bonjour, ma voiture fait un bruit bizarre quand je freine, c'est possible de passer ?" },
          { from: "assistant", text: "Bonjour. Pour préparer le rendez-vous : le bruit est plutôt un grincement ou un frottement métallique ? Et il apparaît à chaque freinage ou seulement à froid ?" },
          { from: "client", text: "Un frottement métallique, à chaque fois." },
          { from: "assistant", text: "Merci, c'est noté pour le mécanicien. Je peux vous proposer jeudi 9h ou vendredi 14h. Pensez à apporter la carte grise." },
        ],
      },
      savings: {
        sliderA: { label: "Véhicules par jour", min: 2, max: 30, default: 8, minutesEach: 4 },
        sliderB: { label: "Appels par jour", min: 3, max: 50, default: 15, minutesEach: 3 },
        daysPerMonth: 22,
        note: "Estimation indicative, à partir du temps moyen passé à qualifier une demande et à préparer un devis.",
      },
      contract: {
        included: [
          "Un assistant actif pendant et hors ouverture",
          "Prise de rendez-vous et préparation des devis",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "prestations", label: "Prestations proposées", type: "textarea", required: true },
        { key: "horaires", label: "Horaires d'ouverture", type: "textarea", required: true },
        { key: "vehicule_pret", label: "Proposez-vous un véhicule de prêt ?", type: "boolean", required: false },
        { key: "marques", label: "Marques que vous prenez en charge", type: "text", required: false },
      ],
    },
  },
  {
    slug: "salon-de-coiffure",
    name: "Salon de coiffure",
    sector: "Beauté",
    benefit: "Elle réserve, confirme et rappelle pour limiter les rendez-vous manqués.",
    needs: ["Prendre les rendez-vous", "Rappeler les clients", "Répondre sur Instagram"],
    monthlyPriceEur: 89,
    position: 4,
    content: {
      assistantName: "Chloé",
      assistantRole: "votre assistante d'accueil",
      intro:
        "Voici Chloé. Elle prend les rendez-vous par téléphone et sur Instagram, envoie les confirmations et les rappels, et propose les créneaux libérés.",
      dayTimeline: [
        { time: "9h00", text: "Elle traite les demandes de réservation reçues sur Instagram pendant la nuit." },
        { time: "11h30", text: "Une cliente annule sa couleur de l'après-midi : elle propose le créneau à la liste d'attente." },
        { time: "16h00", text: "Elle envoie les rappels des rendez-vous du lendemain." },
        { time: "19h30", text: "Après la fermeture, elle prend deux réservations pour le week-end." },
      ],
      canDo: [
        "Prendre, déplacer et annuler des rendez-vous",
        "Répondre aux demandes reçues par téléphone et sur Instagram",
        "Envoyer les confirmations et les rappels de rendez-vous",
        "Gérer une liste d'attente et proposer les créneaux libérés",
        "Répondre aux questions sur les prestations, les tarifs affichés et les horaires",
        "Prendre les coordonnées d'une nouvelle cliente",
      ],
      cannotDo: [
        "Conseiller une coloration ou une coupe précise sans le coiffeur",
        "Appliquer une remise non prévue",
        "Réserver au-delà des disponibilités que vous avez indiquées",
      ],
      demo: {
        intro: "Une cliente écrit sur Instagram le soir. Voici comment Chloé répond.",
        messages: [
          { from: "client", text: "Bonsoir, je voudrais un balayage samedi si possible." },
          { from: "assistant", text: "Bonsoir ! Samedi, il reste un créneau à 10h et un à 15h30 pour un balayage. Lequel préférez-vous ?" },
          { from: "client", text: "10h svp." },
          { from: "assistant", text: "Parfait, je note un balayage samedi à 10h. À quel nom, et un numéro pour la confirmation ?" },
          { from: "client", text: "Inès, 06 98 76 54 32." },
          { from: "assistant", text: "Merci Inès, c'est confirmé pour samedi 10h. Vous recevrez un rappel la veille." },
        ],
      },
      savings: {
        sliderA: { label: "Clientes par jour", min: 3, max: 40, default: 12, minutesEach: 3 },
        sliderB: { label: "Messages Instagram par jour", min: 2, max: 40, default: 10, minutesEach: 4 },
        daysPerMonth: 24,
        note: "Estimation indicative, à partir du temps moyen passé à répondre et à gérer l'agenda.",
      },
      contract: {
        included: [
          "Un assistant actif pendant et hors ouverture",
          "Réservations par téléphone et sur Instagram",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "prestations", label: "Prestations et durées", type: "textarea", required: true },
        { key: "coiffeurs", label: "Noms des coiffeurs", type: "textarea", required: false },
        { key: "horaires", label: "Jours et horaires d'ouverture", type: "textarea", required: true },
        { key: "instagram", label: "Nom du compte Instagram", type: "text", required: false },
      ],
    },
  },
  {
    slug: "agence-immobiliere",
    name: "Agence immobilière",
    sector: "Immobilier",
    benefit: "Elle qualifie les acheteurs, planifie les visites et relance les dossiers.",
    needs: ["Qualifier une demande", "Planifier les visites", "Relancer les dossiers"],
    monthlyPriceEur: 89,
    position: 5,
    content: {
      assistantName: "Inès",
      assistantRole: "votre assistante d'agence",
      intro:
        "Voici Inès. Elle répond aux demandes reçues sur les annonces, pose les questions qui trient les dossiers sérieux, cale les visites et relance.",
      dayTimeline: [
        { time: "8h30", text: "Elle traite les demandes de visite reçues la nuit sur les portails d'annonces." },
        { time: "10h00", text: "Un contact demande un bien : elle vérifie le budget et le financement avant de proposer une visite." },
        { time: "14h30", text: "Elle cale trois visites pour le samedi et envoie les confirmations." },
        { time: "18h00", text: "Elle relance les visiteurs de la semaine passée pour recueillir leur retour." },
      ],
      canDo: [
        "Répondre aux demandes reçues sur les annonces",
        "Poser les questions de qualification : budget, financement, délai, situation",
        "Proposer et confirmer des créneaux de visite",
        "Relancer les visiteurs pour obtenir leur retour",
        "Répondre aux questions publiques sur un bien (surface, étage, charges affichées)",
        "Noter les demandes d'estimation pour un agent",
      ],
      cannotDo: [
        "Communiquer l'adresse exacte d'un bien avant qualification",
        "Négocier un prix",
        "S'engager sur la faisabilité d'un financement",
      ],
      demo: {
        intro: "Un contact écrit après une annonce. Voici comment Inès répond.",
        messages: [
          { from: "client", text: "Bonjour, le 3 pièces du centre est toujours disponible ? Je peux le visiter cette semaine ?" },
          { from: "assistant", text: "Bonjour, oui il est disponible. Pour organiser la visite : quel est votre budget, et avez-vous déjà un accord de principe pour le financement ?" },
          { from: "client", text: "Budget 240 000 €, j'ai un accord de principe de ma banque." },
          { from: "assistant", text: "Parfait. Je peux vous proposer jeudi 18h ou samedi 11h. Lequel vous convient ? Je vous envoie l'adresse exacte à la confirmation." },
        ],
      },
      savings: {
        sliderA: { label: "Demandes sur annonces par jour", min: 2, max: 40, default: 12, minutesEach: 5 },
        sliderB: { label: "Visites par semaine", min: 1, max: 40, default: 10, minutesEach: 6 },
        daysPerMonth: 22,
        note: "Estimation indicative, à partir du temps moyen passé à qualifier un contact et à organiser une visite.",
      },
      contract: {
        included: [
          "Un assistant actif 24h/24, 7j/7",
          "Qualification des contacts et prise de visites",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "secteur", label: "Secteur géographique couvert", type: "text", required: true },
        { key: "agents", label: "Noms des agents", type: "textarea", required: false },
        { key: "questions_quali", label: "Questions de qualification à poser en priorité", type: "textarea", required: false },
        { key: "portails", label: "Portails d'annonces utilisés", type: "text", required: false },
      ],
    },
  },
  {
    slug: "artisan-batiment",
    name: "Artisan du bâtiment",
    sector: "Bâtiment",
    benefit: "Il répond, note les demandes et relance vos devis en attente.",
    needs: ["Répondre au téléphone", "Noter les demandes", "Relancer les devis"],
    monthlyPriceEur: 89,
    position: 6,
    content: {
      assistantName: "Thomas",
      assistantRole: "votre assistant de chantier",
      intro:
        "Voici Thomas. Il répond quand vous êtes sur un chantier, note précisément chaque demande de travaux, et relance les devis que vous avez envoyés.",
      dayTimeline: [
        { time: "7h15", text: "Il répond aux appels reçus tôt et note les demandes de dépannage." },
        { time: "9h30", text: "Un particulier décrit des travaux de salle de bain : il pose les questions utiles et prend les coordonnées." },
        { time: "12h00", text: "Il relance deux devis envoyés il y a trois semaines et restés sans réponse." },
        { time: "17h00", text: "Il regroupe les demandes du jour et vous les transmet, classées par urgence." },
      ],
      canDo: [
        "Répondre aux appels et aux messages quand vous êtes sur le chantier",
        "Noter précisément une demande de travaux (nature, lieu, délai souhaité)",
        "Prendre les coordonnées et proposer un créneau pour un métré",
        "Relancer les devis en attente selon le rythme que vous fixez",
        "Répondre aux questions sur votre zone d'intervention et vos spécialités",
        "Regrouper et vous transmettre les demandes, classées par urgence",
      ],
      cannotDo: [
        "Chiffrer des travaux sans votre validation",
        "S'engager sur une date de démarrage de chantier",
        "Donner un avis technique sur une malfaçon",
      ],
      demo: {
        intro: "Un particulier appelle pendant que vous êtes sur un toit. Voici comment Thomas répond.",
        messages: [
          { from: "client", text: "Bonjour, j'ai une fuite sous l'évier de la cuisine, vous pourriez venir ?" },
          { from: "assistant", text: "Bonjour. C'est noté comme intervention à traiter rapidement. L'eau coule en continu ou seulement quand vous ouvrez le robinet ?" },
          { from: "client", text: "Seulement quand j'ouvre le robinet." },
          { from: "assistant", text: "Merci. Pouvez-vous me donner votre nom, votre adresse et un numéro ? Je transmets tout de suite à l'artisan avec la mention urgente." },
        ],
      },
      savings: {
        sliderA: { label: "Appels par jour", min: 2, max: 40, default: 12, minutesEach: 4 },
        sliderB: { label: "Devis en attente de relance", min: 0, max: 60, default: 15, minutesEach: 6 },
        daysPerMonth: 22,
        note: "Estimation indicative, à partir du temps moyen passé au téléphone et à relancer les devis.",
      },
      contract: {
        included: [
          "Un assistant qui répond même quand vous êtes en hauteur",
          "Prise de demandes et relance des devis",
          "300 demandes par mois",
          "Support par email sous 48 h",
          "14 jours d'essai",
        ],
        cancellation,
      },
      personalization: [
        { key: "specialites", label: "Vos spécialités", type: "textarea", required: true },
        { key: "zone", label: "Zone d'intervention", type: "text", required: true },
        { key: "rythme_relance", label: "Au bout de combien de jours relancer un devis ?", type: "text", required: false },
        { key: "urgences", label: "Prenez-vous les dépannages urgents ?", type: "boolean", required: true },
      ],
    },
  },
];
