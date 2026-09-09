import type { PricingRuleKind } from "@prisma/client";

/**
 * Barème de chiffrage par défaut (§4.2). Sert de graine à la table `pricing_rules` ;
 * une fois en base, tout se règle depuis le back-office (Lot 10) sans redéploiement.
 * Montants en centimes d'euro.
 */
export interface PricingRuleSeed {
  kind: PricingRuleKind;
  key: string;
  label: string;
  setupCents: number;
  monthlyCents: number;
  factor: number;
  position: number;
}

export const pricingRuleSeeds: PricingRuleSeed[] = [
  // Socle selon la formule (§7)
  { kind: "socle", key: "sur-mesure", label: "Employé virtuel sur mesure", setupCents: 89_000, monthlyCents: 19_900, factor: 1, position: 0 },
  { kind: "socle", key: "sur-mesure-plus", label: "Employé virtuel sur mesure +", setupCents: 150_000, monthlyCents: 39_900, factor: 1, position: 1 },

  // Modules par tâche : coût de mise en place + poids d'usage sur le mensuel
  { kind: "module", key: "repondre-tel", label: "Répondre au téléphone", setupCents: 15_000, monthlyCents: 4_000, factor: 1, position: 0 },
  { kind: "module", key: "prendre-rdv", label: "Prendre et déplacer les rendez-vous", setupCents: 20_000, monthlyCents: 5_000, factor: 1, position: 1 },
  { kind: "module", key: "reserver", label: "Prendre les réservations", setupCents: 20_000, monthlyCents: 5_000, factor: 1, position: 2 },
  { kind: "module", key: "questions", label: "Répondre aux questions habituelles", setupCents: 10_000, monthlyCents: 2_000, factor: 1, position: 3 },
  { kind: "module", key: "relancer-devis", label: "Relancer les devis", setupCents: 15_000, monthlyCents: 3_000, factor: 1, position: 4 },
  { kind: "module", key: "qualifier", label: "Qualifier les demandes", setupCents: 15_000, monthlyCents: 4_000, factor: 1, position: 5 },
  { kind: "module", key: "rappels", label: "Rappeler les clients", setupCents: 10_000, monthlyCents: 2_000, factor: 1, position: 6 },
  { kind: "module", key: "commandes", label: "Préparer les commandes fournisseurs", setupCents: 20_000, monthlyCents: 4_000, factor: 1, position: 7 },

  // Coefficient de volume appliqué au mensuel
  { kind: "volume", key: "0-50", label: "Moins de 50 demandes / mois", setupCents: 0, monthlyCents: 0, factor: 1, position: 0 },
  { kind: "volume", key: "50-200", label: "50 à 200 demandes / mois", setupCents: 0, monthlyCents: 0, factor: 1.15, position: 1 },
  { kind: "volume", key: "200-500", label: "200 à 500 demandes / mois", setupCents: 0, monthlyCents: 0, factor: 1.4, position: 2 },
  { kind: "volume", key: "500+", label: "Plus de 500 demandes / mois", setupCents: 0, monthlyCents: 0, factor: 1.8, position: 3 },

  // Coût de connexion par outil à raccorder
  { kind: "outil", key: "google", label: "Connexion à Google Agenda", setupCents: 0, monthlyCents: 0, factor: 1, position: 0 },
  { kind: "outil", key: "outlook", label: "Connexion à Outlook", setupCents: 0, monthlyCents: 0, factor: 1, position: 1 },
  { kind: "outil", key: "reservation", label: "Connexion à votre outil de réservation", setupCents: 15_000, monthlyCents: 0, factor: 1, position: 2 },
  { kind: "outil", key: "papier", label: "Mise en place d'un agenda partagé", setupCents: 6_000, monthlyCents: 0, factor: 1, position: 3 },
  { kind: "outil", key: "caisse", label: "Connexion à votre logiciel de caisse ou de gestion", setupCents: 25_000, monthlyCents: 0, factor: 1, position: 4 },
  { kind: "outil", key: "tableur", label: "Connexion à votre tableur", setupCents: 8_000, monthlyCents: 0, factor: 1, position: 5 },
  { kind: "outil", key: "crm", label: "Connexion à votre fichier clients", setupCents: 12_000, monthlyCents: 0, factor: 1, position: 6 },
];
