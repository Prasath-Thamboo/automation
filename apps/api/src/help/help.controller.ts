import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  askHelpSchema,
  helpFeedbackSchema,
  type AskHelp,
  type HelpFeedback,
  type HelpHome,
  type HelpReply,
  type HelpRequestItem,
  type SessionUser,
} from "@velekya/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { HelpService } from "./help.service";

/** Lot 15 — « Une question ? » (espace client, web + mobile). */
@ApiTags("help")
@Controller("me/help")
@UseGuards(SessionGuard)
export class HelpController {
  constructor(private readonly help: HelpService) {}

  @Get()
  @ApiOkResponse({ description: "Questions fréquentes + questions déjà posées par l'organisation." })
  home(@CurrentUser() user: SessionUser): Promise<HelpHome> {
    return this.help.home(user);
  }

  @Post("ask")
  @HttpCode(200)
  ask(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(askHelpSchema)) body: AskHelp,
  ): Promise<HelpReply> {
    return this.help.ask(user, body);
  }

  @Post("requests/:id/feedback")
  @HttpCode(200)
  feedback(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(helpFeedbackSchema)) body: HelpFeedback,
  ): Promise<HelpRequestItem> {
    return this.help.feedback(user, id, body.helpful);
  }

  @Post("requests/:id/transmit")
  @HttpCode(200)
  transmit(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HelpRequestItem> {
    return this.help.transmit(user, id);
  }
}
