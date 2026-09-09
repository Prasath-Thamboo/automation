import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { PaymentModule } from "./payment/payment.module";
import { SequenceService } from "./sequence.service";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { WebhooksController } from "./webhooks.controller";
import { AdminBillingService } from "./admin-billing.service";
import { AdminBillingController } from "./admin-billing.controller";
import { MonthlyBillingWorker } from "./monthly-billing.worker";

@Module({
  imports: [AuthModule, QueueModule, PaymentModule],
  controllers: [BillingController, WebhooksController, AdminBillingController],
  providers: [SequenceService, BillingService, AdminBillingService, MonthlyBillingWorker],
  exports: [BillingService],
})
export class BillingModule {}
