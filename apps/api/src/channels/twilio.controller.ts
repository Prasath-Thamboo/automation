import {
  Body,
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { ENV } from "../config/config.module";
import { channelWebhookSecrets, type Env } from "../config/env";
import { ChannelsService } from "./channels.service";
import { EMPTY_TWIML, stringParams, verifyTwilioSignature } from "./providers/twilio";

/**
 * Webhooks Twilio (Lot 12) : SMS reçus et appels entrants sur les numéros des
 * assistants. Chaque appel est signé (`X-Twilio-Signature`) avec le jeton du
 * compte, calculé sur l'URL publique — `TWILIO_WEBHOOK_BASE_URL` derrière un
 * proxy.
 */
@ApiExcludeController()
@Controller("channels/twilio")
@SkipThrottle()
export class TwilioController {
  constructor(
    private readonly channels: ChannelsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private base(): string {
    return (this.env.TWILIO_WEBHOOK_BASE_URL ?? this.env.API_URL).replace(/\/$/, "");
  }

  private verified(req: Request, body: unknown): Record<string, string> {
    const params = stringParams(body);
    const signature = req.headers["x-twilio-signature"];
    const ok = verifyTwilioSignature(
      channelWebhookSecrets(this.env).twilioToken,
      `${this.base()}${req.originalUrl}`,
      params,
      typeof signature === "string" ? signature : undefined,
    );
    if (!ok) throw new ForbiddenException("Signature invalide.");
    return params;
  }

  @Post("sms")
  @HttpCode(200)
  @Header("Content-Type", "text/xml")
  async sms(@Req() req: Request, @Body() body: unknown): Promise<string> {
    await this.channels.receiveSms(this.verified(req, body));
    // Réponse vide : la réponse de l'assistant part via la file `channel-out`.
    return EMPTY_TWIML;
  }

  @Post("voice")
  @HttpCode(200)
  @Header("Content-Type", "text/xml")
  voice(@Req() req: Request, @Body() body: unknown): Promise<string> {
    return this.channels.incomingCall(
      this.verified(req, body),
      `${this.base()}/api/v1/channels/twilio/voice/after-dial`,
    );
  }

  @Post("voice/after-dial")
  @HttpCode(200)
  @Header("Content-Type", "text/xml")
  afterDial(@Req() req: Request, @Body() body: unknown): Promise<string> {
    return this.channels.afterDial(this.verified(req, body));
  }
}
