import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  startPaymentSchema,
  type CheckoutInfo,
  type DocumentsBundle,
  type PaymentOutcome,
  type SessionUser,
  type StartPayment,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { BillingService } from "./billing.service";
import { renderInvoiceDocument } from "./invoice-document";

@ApiTags("billing")
@Controller("me")
@UseGuards(SessionGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("documents")
  @ApiOkResponse({ description: "Abonnement, factures et avoirs de l'organisation." })
  documents(@CurrentUser() user: SessionUser): Promise<DocumentsBundle> {
    return this.billing.documentsFor(user.organizationId);
  }

  @Get("invoices/:number/document")
  @Header("content-type", "text/html; charset=utf-8")
  async invoiceDocument(
    @CurrentUser() user: SessionUser,
    @Param("number") number: string,
  ): Promise<string> {
    const doc = await this.billing.invoiceDoc(user.organizationId, number);
    return renderInvoiceDocument(doc);
  }

  @Post("payments/start")
  @ApiOkResponse({ description: "Démarre le paiement d'une facture." })
  start(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(startPaymentSchema)) body: StartPayment,
  ): Promise<CheckoutInfo> {
    return this.billing.startPayment(user.organizationId, body.invoiceNumber, user.email);
  }

  @Post("payments/:ref/confirm")
  @ApiOkResponse({ description: "Confirme un paiement (mode démonstration uniquement)." })
  confirm(
    @CurrentUser() user: SessionUser,
    @Param("ref") ref: string,
  ): Promise<PaymentOutcome> {
    return this.billing.confirmFakePayment(user.organizationId, ref);
  }
}
