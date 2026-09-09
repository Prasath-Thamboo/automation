import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { PushService } from "./push.service";
import { NotificationPrefsService } from "./notification-prefs.service";
import { PushWorker } from "./push.worker";
import { NotificationsController } from "./notifications.controller";

/**
 * Notifications push et réglages (§6bis). Global : le moteur (escalade) et la
 * facturation (échec de paiement) déclenchent des envois sans créer de cycle
 * d'imports entre modules.
 */
@Global()
@Module({
  imports: [AuthModule, QueueModule],
  controllers: [NotificationsController],
  providers: [PushService, NotificationPrefsService, PushWorker],
  exports: [PushService, NotificationPrefsService],
})
export class NotificationsModule {}
