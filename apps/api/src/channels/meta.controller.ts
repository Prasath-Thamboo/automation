import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { ENV } from "../config/config.module";
import { channelWebhookSecrets, type Env } from "../config/env";
import { ChannelsService } from "./channels.service";
import { verifyMetaSignature } from "./providers/meta";
import { safeEqual } from "./webhook-auth";

/**
 * Webhook de l'application Meta (Lot 12) : WhatsApp Business et Instagram.
 * GET : vérification de l'abonnement ; POST : messages, signés
 * (`X-Hub-Signature-256`) avec le secret de l'application.
 */
@ApiExcludeController()
@Controller("channels/meta")
@SkipThrottle()
export class MetaController {
  constructor(
    private readonly channels: ChannelsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  @Header("Content-Type", "text/plain")
  verify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") token: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
  ): string {
    if (mode !== "subscribe" || !safeEqual(token, channelWebhookSecrets(this.env).metaVerifyToken)) {
      throw new ForbiddenException("Accès refusé.");
    }
    return challenge ?? "";
  }

  @Post()
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>): Promise<{ ok: true }> {
    const raw = req.rawBody?.toString("utf8") ?? "";
    const signature = req.headers["x-hub-signature-256"];
    if (
      !verifyMetaSignature(
        channelWebhookSecrets(this.env).metaAppSecret,
        raw,
        typeof signature === "string" ? signature : undefined,
      )
    ) {
      throw new ForbiddenException("Signature invalide.");
    }
    await this.channels.receiveMeta(req.body);
    return { ok: true };
  }
}
