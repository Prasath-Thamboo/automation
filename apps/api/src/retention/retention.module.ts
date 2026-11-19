import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RetentionService } from "./retention.service";
import { RetentionWorker } from "./retention.worker";

/** Durées de conservation et purge automatique (§9.4, Lot 18). */
@Module({
  imports: [QueueModule],
  providers: [RetentionService, RetentionWorker],
  exports: [RetentionService],
})
export class RetentionModule {}
