import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  startPaymentSchema,
  type CardSetupInfo,
  type CheckoutInfo,
  type DocumentsBundle,
  type PaymentOutcome,
  type SavedCardView,
  type SessionUser,
  type StartPayment,
} from "@velekya/types";
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

  // ── Lot 22 : carte enregistrée ────────────────────────────────────────────

  @Post("saved-card/setup")
  @ApiOkResponse({ description: "Ouvre l'enregistrement d'une carte pour le prélèvement automatique." })
  startCardSetup(@CurrentUser() user: SessionUser): Promise<CardSetupInfo> {
    requireOwner(user);
    return this.billing.startCardSetup(user.organizationId, user.email);
  }

  @Post("saved-card/:ref/confirm")
  @ApiOkResponse({ description: "Confirme l'enregistrement d'une carte (mode démonstration uniquement)." })
  confirmCardSetup(
    @CurrentUser() user: SessionUser,
    @Param("ref") ref: string,
  ): Promise<SavedCardView | null> {
    requireOwner(user);
    return this.billing.confirmFakeCardSetup(user.organizationId, ref);
  }

  @Post("saved-card/remove")
  @ApiOkResponse({ description: "Retire la carte enregistrée." })
  async removeSavedCard(@CurrentUser() user: SessionUser): Promise<{ ok: true }> {
    requireOwner(user);
    await this.billing.removeSavedCard(user.organizationId, user.id);
    return { ok: true };
  }
}

/** Le moyen de paiement engage l'entreprise : titulaire (ou administrateur) seulement. */
function requireOwner(user: SessionUser): void {
  if (user.role !== "owner" && user.role !== "admin") {
    throw new ForbiddenException("Seul le titulaire du compte peut gérer le moyen de paiement.");
  }
}
