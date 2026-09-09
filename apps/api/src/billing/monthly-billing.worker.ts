import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.module";
import { BILLING_QUEUE_NAME, type BillingJob } from "../queue/queue.module";
import { BillingService } from "./billing.service";

/** Émet et encaisse les factures d'abonnement mensuelles. */
@Injectable()
export class MonthlyBillingWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("MonthlyBilling");
  private worker?: Worker<BillingJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly billing: BillingService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<BillingJob>(
      BILLING_QUEUE_NAME,
      async (job) => {
        if (job.data.type === "monthly") {
          await this.billing.runMonthlyBilling(job.data.subscriptionId);
        }
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Facturation mensuelle en échec (${job?.id}) : ${err.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
