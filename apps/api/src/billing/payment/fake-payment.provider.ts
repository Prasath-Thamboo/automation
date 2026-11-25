import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import type {
  ChargeSavedCardInput,
  ChargeSavedCardResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  SavedCardDetails,
  StartCardSetupInput,
  StartCardSetupResult,
  WebhookOutcome,
} from "./payment-provider";

const hex = (n: number) => randomBytes(n).toString("hex");

/**
 * Fournisseur de paiement de développement. Ne bouge pas d'argent : le paiement
 * est « confirmé » explicitement par le client (bouton en mode démo) via un
 * endpoint dédié, qui rejoue le même chemin qu'un webhook réussi.
 *
 * Lot 22 : l'enregistrement de carte suit le même principe (confirmé sur place,
 * carte de démonstration « Visa 4242 ») ; le prélèvement d'une carte enregistrée
 * réussit toujours.
 */
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";
  private readonly logger = new Logger("FakePayment");

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const ref = `fake_${hex(9)}`;
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
        setupRef?: string;
        result?: "succeeded" | "failed" | "setup_succeeded";
      };
      if (body.result === "setup_succeeded" && body.setupRef) {
        return {
          eventId: body.id ?? `fake_evt_${body.setupRef}`,
          type: body.type ?? "fake.setup",
          paymentRef: null,
          result: "setup_succeeded",
          setupRef: body.setupRef,
        };
      }
      if (!body.paymentRef || !body.result || body.result === "setup_succeeded") return null;
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

  async startCardSetup(input: StartCardSetupInput): Promise<StartCardSetupResult> {
    return {
      ref: `fake_setup_${hex(9)}`,
      checkoutUrl: null,
      customerRef: input.customerRef ?? `fake_cus_${hex(6)}`,
    };
  }

  async completeCardSetup(): Promise<SavedCardDetails> {
    return {
      customerRef: null,
      methodRef: `fake_pm_${hex(9)}`,
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: new Date().getUTCFullYear() + 3,
    };
  }

  async chargeSavedCard(input: ChargeSavedCardInput): Promise<ChargeSavedCardResult> {
    const ref = `fake_pi_${hex(9)}`;
    this.logger.log(`Prélèvement simulé ${ref} pour ${input.invoiceNumber}`);
    return { ref, status: "succeeded" };
  }

  async detachCard(methodRef: string): Promise<void> {
    this.logger.log(`Carte simulée ${methodRef} retirée`);
  }
}
