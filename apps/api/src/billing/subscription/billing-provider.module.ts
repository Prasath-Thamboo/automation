import { Global, Module } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { BILLING_PROVIDER, type BillingProvider } from "./billing-provider";
import { OutOfAppBillingProvider } from "./out-of-app-billing.provider";

/**
 * Fournit l'implémentation de `BillingProvider` selon `BILLING_PROVIDER`.
 * Seul `out-of-app` existe pour le MVP (décision Lot 9). `revenuecat` est
 * réservé : construire ce fournisseur échoue explicitement tant qu'il n'est pas
 * implémenté — on ne laisse pas le produit démarrer dans un état ambigu.
 */
@Global()
@Module({
  providers: [
    {
      provide: BILLING_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env): BillingProvider => {
        if (env.BILLING_PROVIDER === "revenuecat") {
          throw new Error(
            "BILLING_PROVIDER=revenuecat n'est pas encore disponible. " +
              "Le Lot 9 livre uniquement « out-of-app » (abonnement géré sur le web).",
          );
        }
        return new OutOfAppBillingProvider(env.BILLING_MANAGE_URL, env.BILLING_MANAGE_HINT);
      },
    },
  ],
  exports: [BILLING_PROVIDER],
})
export class BillingProviderModule {}
