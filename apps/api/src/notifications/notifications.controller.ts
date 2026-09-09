import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  registerPushTokenSchema,
  removePushTokenSchema,
  updateNotificationPrefsSchema,
  type NotificationPrefs,
  type RegisterPushToken,
  type RemovePushToken,
  type SessionUser,
  type UpdateNotificationPrefs,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PushService } from "./push.service";
import { NotificationPrefsService } from "./notification-prefs.service";

@ApiTags("notifications")
@Controller("me")
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(
    private readonly push: PushService,
    private readonly prefs: NotificationPrefsService,
  ) {}

  @Post("push-tokens")
  @ApiOkResponse({ description: "Enregistre l'appareil pour les notifications." })
  async registerPushToken(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(registerPushTokenSchema)) body: RegisterPushToken,
  ): Promise<{ ok: true }> {
    await this.push.registerToken(user.id, user.organizationId, body);
    return { ok: true };
  }

  @Post("push-tokens/remove")
  @ApiOkResponse({ description: "Oublie l'appareil (déconnexion, réglages)." })
  async removePushToken(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(removePushTokenSchema)) body: RemovePushToken,
  ): Promise<{ ok: true }> {
    await this.push.removeToken(user.id, body.token);
    return { ok: true };
  }

  @Get("notification-preferences")
  notificationPrefs(@CurrentUser() user: SessionUser): Promise<NotificationPrefs> {
    return this.prefs.get(user.id);
  }

  @Put("notification-preferences")
  updateNotificationPrefs(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateNotificationPrefsSchema)) body: UpdateNotificationPrefs,
  ): Promise<NotificationPrefs> {
    return this.prefs.update(user.id, body);
  }
}
