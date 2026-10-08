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
import { CHANNEL_QUEUE_NAME, type ChannelOutJob } from "../queue/queue.module";
import { ChannelDeliveryService } from "./channel-delivery.service";

/** Worker de la file `channel-out` : remise des réponses aux clients finaux. */
@Injectable()
export class ChannelDeliveryWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("ChannelDeliveryWorker");
  private worker?: Worker<ChannelOutJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly delivery: ChannelDeliveryService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<ChannelOutJob>(
      CHANNEL_QUEUE_NAME,
      async (job) => {
        await this.delivery.deliver(job.data.messageId);
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      if (!job) return;
      const final = job.attemptsMade >= (job.opts.attempts ?? 1);
      this.logger.warn(
        `Remise échouée (message ${job.data.messageId}, tentative ${job.attemptsMade}) : ${err.message}`,
      );
      if (final) void this.delivery.markFailed(job.data.messageId, err.message);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
