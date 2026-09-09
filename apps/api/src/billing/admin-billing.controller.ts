import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  issueCreditNoteSchema,
  type AdminInvoiceList,
  type CreditNoteDoc,
  type IssueCreditNote,
  type SessionUser,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminBillingService } from "./admin-billing.service";

@ApiTags("admin-billing")
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminBillingController {
  constructor(private readonly billing: AdminBillingService) {}

  @Get("invoices")
  @ApiOkResponse({ description: "Toutes les factures + montants déjà crédités." })
  list(): Promise<AdminInvoiceList> {
    return this.billing.list();
  }

  @Post("invoices/:id/credit-note")
  @ApiOkResponse({ description: "Émet un avoir (la facture n'est jamais modifiée)." })
  creditNote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(issueCreditNoteSchema)) body: IssueCreditNote,
    @CurrentUser() user: SessionUser,
  ): Promise<CreditNoteDoc> {
    return this.billing.creditNote(id, body, user.id);
  }

  @Get("accounting/export")
  @Header("cache-control", "no-store")
  async export(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("format") format: string,
    @Res() res: Response,
  ): Promise<void> {
    const fromDate = parseDate(from, new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)));
    const toDate = parseDate(to, new Date());
    const fmt = format === "fec" ? "fec" : "csv";
    const { filename, body } = await this.billing.export(fromDate, toDate, fmt);
    res
      .status(200)
      .header("content-type", fmt === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8")
      .header("content-disposition", `attachment; filename="${filename}"`)
      .send(body);
  }
}

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}
