import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import {
  formMessageSchema,
  type FormMessage,
  type FormReply,
  type PublicFormInfo,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ChannelsService } from "./channels.service";

/**
 * Formulaire du site du patron (Lot 12). Public et anonyme : la page
 * `/formulaire/:publicId` du web, intégrable dans son site, l'appelle depuis
 * le navigateur du visiteur. Débit limité par IP, piège à robots.
 */
@ApiTags("canaux")
@Controller("channels/form")
export class FormController {
  constructor(private readonly channels: ChannelsService) {}

  @Get(":publicId")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  info(@Param("publicId") publicId: string): Promise<PublicFormInfo> {
    return this.channels.formInfo(publicId);
  }

  @Post(":publicId")
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  message(
    @Param("publicId") publicId: string,
    @Body(new ZodValidationPipe(formMessageSchema)) body: FormMessage,
  ): Promise<FormReply> {
    return this.channels.formMessage(publicId, body);
  }
}
