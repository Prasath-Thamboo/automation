import { Module } from "@nestjs/common";
import { RetentionService } from "./retention.service";

/** Durées de conservation et purge (§9.4, Lot 18). Planifiée par `MaintenanceModule`. */
@Module({
  providers: [RetentionService],
  exports: [RetentionService],
})
export class RetentionModule {}
