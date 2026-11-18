import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  createAdminChannelSchema,
  updateAdminChannelSchema,
  type AdminChannel,
  type AdminChannelList,
  type CreateAdminChannel,
  type SessionUser,
  type UpdateAdminChannel,
} from "@velekya/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminChannelsService } from "./admin-channels.service";

@ApiTags("admin-channels")
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminChannelsController {
  constructor(private readonly channels: AdminChannelsService) {}

  @Get("assistants/:id/channels")
  list(@Param("id", ParseUUIDPipe) id: string): Promise<AdminChannelList> {
    return this.channels.list(id);
  }

  @Post("assistants/:id/channels")
  create(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createAdminChannelSchema)) body: CreateAdminChannel,
  ): Promise<AdminChannel> {
    return this.channels.create(id, body, user.id);
  }

  @Patch("channels/:id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateAdminChannelSchema)) body: UpdateAdminChannel,
  ): Promise<AdminChannel> {
    return this.channels.update(id, body, user.id);
  }

  @Delete("channels/:id")
  remove(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ ok: true }> {
    return this.channels.remove(id, user.id);
  }
}
