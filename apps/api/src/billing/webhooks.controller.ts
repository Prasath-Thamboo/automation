import { Controller, Post, Req } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { BillingService } from "./billing.service";

@ApiExcludeController()
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly billing: BillingService) {}

  @Post("payments")
  handlePayments(@Req() req: RawBodyRequest<Request>): Promise<{ ok: true }> {
    const raw = req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    const signature =
      (req.headers["stripe-signature"] as string | undefined) ??
      (req.headers["x-tando-signature"] as string | undefined);
    return this.billing.handleWebhook(raw, signature);
  }
}
