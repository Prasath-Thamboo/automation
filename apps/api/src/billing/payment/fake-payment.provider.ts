import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  WebhookOutcome,
} from "./payment-provider";

/**
 * Fournisseur de paiement de développement. Ne bouge pas d'argent : le paiement
 * est « confirmé » explicitement par le client (bouton en mode démo) via un
 * endpoint dédié, qui rejoue le même chemin qu'un webhook réussi.
 */
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";
  private readonly logger = new Logger("FakePayment");

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const ref = `fake_${randomBytes(9).toString("hex")}`;
    this.logger.log(
      `Paiement simulé ${ref} pour ${input.invoiceNumber} (${(input.amountCents / 100).toFixed(2)} ${input.currency})`,
    );
    return { ref, checkoutUrl: null };
  }

  parseWebhook(rawBody: string): WebhookOutcome | null {
    try {
      const body = JSON.parse(rawBody) as {
        id?: string;
        type?: string;
        paymentRef?: string;
        result?: "succeeded" | "failed";
      };
      if (!body.paymentRef || !body.result) return null;
      return {
        eventId: body.id ?? `fake_evt_${body.paymentRef}_${Date.now()}`,
        type: body.type ?? "fake.payment",
        paymentRef: body.paymentRef,
        result: body.result,
      };
    } catch {
      return null;
    }
  }

  async refund(paymentRef: string, amountCents: number): Promise<void> {
    this.logger.log(`Remboursement simulé de ${(amountCents / 100).toFixed(2)} sur ${paymentRef}`);
  }
}
