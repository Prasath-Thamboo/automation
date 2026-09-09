import type { BillingManageHandoff } from "@tando/types";

/**
 * Rail d'abonnement, isolé derrière une interface (§10, Lot 9 — même principe que
 * `PaymentProvider` et `AssistantRuntime`). La décision produit du Lot 9 est
 * « Stripe hors application » : l'abonnement se souscrit et se gère sur le web,
 * l'application mobile ne vend rien. `BillingProvider` ne porte donc, pour le
 * MVP, que le renvoi vers la gestion du contrat. Un futur fournisseur d'achat
 * intégré (RevenueCat) se brancherait derrière la même interface sans toucher au
 * reste du produit.
 */
export const BILLING_PROVIDER = Symbol("BILLING_PROVIDER");

export interface ManageHandoffInput {
  organizationId: string;
  customerEmail: string;
}

export interface BillingProvider {
  readonly name: string;
  /** Où et comment le client gère son contrat, en dehors de l'app mobile. */
  manageHandoff(input: ManageHandoffInput): Promise<BillingManageHandoff>;
}
