import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AssistantChannels, SessionUser } from "@tando/types";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ChannelsService } from "./channels.service";

/** Espace client : par où ses clients joignent son employé virtuel. */
@ApiTags("canaux")
@Controller("me/assistants")
@UseGuards(SessionGuard)
export class MyChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get(":id/channels")
  list(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AssistantChannels> {
    return this.channels.forClient(user.organizationId, id);
  }
}
