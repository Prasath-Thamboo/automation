import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.module";
import { PUSH_QUEUE, PUSH_QUEUE_NAME, type PushJob } from "../queue/queue.module";
import { PushService } from "./push.service";

const DAILY_TICK_JOB = "daily-summary-tick";

/**
 * Livre les notifications push et déclenche le résumé quotidien (§6bis).
 * Un job répétable horaire (`daily-summary-tick`) décide à qui l'envoyer.
 */
@Injectable()
export class PushWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("PushWorker");
  private worker?: Worker<PushJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(PUSH_QUEUE) private readonly queue: Queue<PushJob>,
    private readonly push: PushService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker<PushJob>(
      PUSH_QUEUE_NAME,
      async (job) => {
        if (job.name === DAILY_TICK_JOB || job.data.type === "daily-summary-tick") {
          await this.push.runDailySummaryTick();
          return;
        }
        await this.push.dispatch(job.data);
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Notification en échec (${job?.id}) : ${err.message}`);
    });

    // Réveil horaire pour le résumé quotidien. `jobId` fixe => un seul planificateur.
    try {
      await this.queue.add(
        DAILY_TICK_JOB,
        { type: "daily-summary-tick" },
        {
          jobId: DAILY_TICK_JOB,
          repeat: { pattern: "0 * * * *" },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Impossible de planifier le résumé quotidien : ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
