import { Body, Controller, ForbiddenException, HttpCode, Inject, Post, Query } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ENV } from "../config/config.module";
import { channelWebhookSecrets, type Env } from "../config/env";
import { ChannelsService } from "./channels.service";
import { safeEqual } from "./webhook-auth";

/**
 * Webhook « Inbound parsing » de Brevo (Lot 12). Brevo ne signe pas ses
 * appels : un jeton secret dans l'URL configurée chez Brevo les authentifie.
 * Réponse 200 dès que le lot est traité (sinon Brevo rejoue).
 */
@ApiExcludeController()
@Controller("channels/email")
@SkipThrottle()
export class EmailInboundController {
  constructor(
    private readonly channels: ChannelsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post("brevo")
  @HttpCode(200)
  async brevo(@Query("token") token: string | undefined, @Body() body: unknown): Promise<{ handled: number }> {
    if (!safeEqual(token, channelWebhookSecrets(this.env).brevoToken)) {
      throw new ForbiddenException("Accès refusé.");
    }
    return { handled: await this.channels.receiveEmails(body) };
  }
}
