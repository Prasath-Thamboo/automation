import { Body, Controller, Get, Header, Param, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { acceptQuoteSchema, type AcceptQuote, type PublicQuote } from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { QuotesService } from "./quotes.service";
import { renderQuoteDocument } from "./quote-document";

@ApiTags("quotes")
@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get(":number")
  @ApiOkResponse({ description: "Devis vu par le client (lien magique)." })
  view(
    @Param("number") number: string,
    @Query("token") token: string,
  ): Promise<PublicQuote> {
    return this.quotes.view(number, token ?? "");
  }

  @Get(":number/document")
  @Header("content-type", "text/html; charset=utf-8")
  async document(
    @Param("number") number: string,
    @Query("token") token: string,
  ): Promise<string> {
    const quote = await this.quotes.view(number, token ?? "");
    return renderQuoteDocument(quote);
  }

  @Post(":number/accept")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ description: "Acceptation en ligne horodatée ; crée la mission." })
  accept(
    @Param("number") number: string,
    @Query("token") token: string,
    @Body(new ZodValidationPipe(acceptQuoteSchema)) body: AcceptQuote,
    @Req() req: Request,
  ): Promise<PublicQuote> {
    return this.quotes.accept(number, token ?? "", body, req.ip);
  }

  @Post(":number/refuse")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  refuse(
    @Param("number") number: string,
    @Query("token") token: string,
  ): Promise<PublicQuote> {
    return this.quotes.refuse(number, token ?? "");
  }
}
