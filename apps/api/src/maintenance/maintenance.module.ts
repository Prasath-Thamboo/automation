import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RetentionModule } from "../retention/retention.module";
import { SecretBox } from "../channels/secret-box";
import { ChannelKeyRotationService } from "../channels/key-rotation.service";
import { MaintenanceWorker } from "./maintenance.worker";

/** Tâches système planifiées (file `maintenance`) : purge (Lot 18), rechiffrement (Lot 19). */
@Module({
  imports: [QueueModule, RetentionModule],
  providers: [SecretBox, ChannelKeyRotationService, MaintenanceWorker],
})
export class MaintenanceModule {}
