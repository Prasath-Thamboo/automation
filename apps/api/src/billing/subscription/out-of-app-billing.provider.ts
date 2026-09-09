import { Injectable } from "@nestjs/common";
import type { BillingManageHandoff } from "@tando/types";
import type { BillingProvider, ManageHandoffInput } from "./billing-provider";

/**
 * Fournisseur « hors application » (décision Lot 9). L'abonnement vit sur le web
 * (rail Stripe du Lot 4) ; ce fournisseur ne fait que pointer le client vers son
 * espace en ligne. Aucun lien de paiement n'est rendu cliquable sur iOS — l'app
 * mobile n'affiche que `hint`.
 */
@Injectable()
export class OutOfAppBillingProvider implements BillingProvider {
  readonly name = "out-of-app";

  constructor(
    private readonly manageUrl: string,
    private readonly manageHint: string,
  ) {}

  async manageHandoff(_input: ManageHandoffInput): Promise<BillingManageHandoff> {
    return { url: this.manageUrl || null, hint: this.manageHint };
  }
}
