import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { BillingModule } from "../billing/billing.module";
import { AssessmentGuard } from "./assessment.guard";
import { AssessmentsController } from "./assessments.controller";
import { AssessmentsService } from "./assessments.service";
import { PricingService } from "./pricing/pricing.service";
import { QuoteNumberService } from "./quote-number.service";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { AdminQuotesController } from "./admin-quotes.controller";
import { AdminQuotesService } from "./admin-quotes.service";
import { QuoteLifecycleWorker } from "./quote-lifecycle.worker";

@Module({
  imports: [AuthModule, QueueModule, BillingModule],
  controllers: [AssessmentsController, QuotesController, AdminQuotesController],
  providers: [
    AssessmentGuard,
    AssessmentsService,
    PricingService,
    QuoteNumberService,
    QuotesService,
    AdminQuotesService,
    QuoteLifecycleWorker,
  ],
})
export class QuotesModule {}
