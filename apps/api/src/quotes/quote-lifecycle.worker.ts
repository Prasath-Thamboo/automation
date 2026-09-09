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
import { QUOTE_QUEUE_NAME, type QuoteJob } from "../queue/queue.module";
import { QuotesService } from "./quotes.service";

/** Traite les tâches différées des devis : relances J+7 / J+21, expiration J+30. */
@Injectable()
export class QuoteLifecycleWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("QuoteLifecycle");
  private worker?: Worker<QuoteJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly quotes: QuotesService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<QuoteJob>(
      QUOTE_QUEUE_NAME,
      async (job) => {
        switch (job.data.type) {
          case "reminder-j7":
            return this.quotes.handleReminder(job.data.quoteId, "j7");
          case "reminder-j21":
            return this.quotes.handleReminder(job.data.quoteId, "j21");
          case "expire":
            return this.quotes.handleExpire(job.data.quoteId);
        }
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Tâche devis en échec (${job?.name}, ${job?.id}) : ${err.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
