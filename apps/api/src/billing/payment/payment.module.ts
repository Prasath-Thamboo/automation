import { Global, Module } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./payment-provider";
import { FakePaymentProvider } from "./fake-payment.provider";

/** Fournit l'implémentation de `PaymentProvider` selon `PAYMENT_PROVIDER`. */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ENV],
      useFactory: async (env: Env): Promise<PaymentProvider> => {
        if (env.PAYMENT_PROVIDER === "stripe") {
          if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
            throw new Error(
              "PAYMENT_PROVIDER=stripe exige STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.",
            );
          }
          const { default: Stripe } = await import("stripe");
          const { StripePaymentProvider } = await import("./stripe-payment.provider");
          return new StripePaymentProvider(
            new Stripe(env.STRIPE_SECRET_KEY),
            env.STRIPE_WEBHOOK_SECRET,
          );
        }
        return new FakePaymentProvider();
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
