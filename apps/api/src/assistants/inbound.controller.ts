import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiExcludeController } from "@nestjs/swagger";
import { inboundSchema, type Inbound, type InboundResult } from "@tando/types";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RuntimeService } from "./runtime.service";

/**
 * Point d'entrée des demandes des clients (§6bis). Les vrais canaux (téléphone,
 * WhatsApp, email, Instagram…) seront branchés ici au Lot 7 ; pour l'instant un
 * jeton partagé protège l'endpoint.
 */
@ApiExcludeController()
@Controller("inbound")
export class InboundController {
  constructor(
    private readonly runtime: RuntimeService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post(":publicId")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  handle(
    @Param("publicId") publicId: string,
    @Headers("x-tando-inbound-secret") secret: string | undefined,
    @Body(new ZodValidationPipe(inboundSchema)) body: Inbound,
  ): Promise<InboundResult> {
    if (secret !== this.env.INBOUND_SECRET) {
      throw new ForbiddenException("Jeton d'accès invalide.");
    }
    return this.runtime.inbound(publicId, body.channel, body.from, body.text);
  }
}
