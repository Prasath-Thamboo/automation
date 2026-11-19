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
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import {
  MAINTENANCE_QUEUE,
  MAINTENANCE_QUEUE_NAME,
  type MaintenanceJob,
} from "../queue/queue.module";
import { RetentionService } from "./retention.service";

const RETENTION_JOB = "retention";

/**
 * Purge quotidienne (03:00, heure du serveur) des données dont la durée de
 * conservation est échue. `jobId` fixe => un seul planificateur, même avec
 * plusieurs instances de l'API.
 */
@Injectable()
export class RetentionWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("RetentionWorker");
  private worker?: Worker<MaintenanceJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(MAINTENANCE_QUEUE) private readonly queue: Queue<MaintenanceJob>,
    @Inject(ENV) private readonly env: Env,
    private readonly retention: RetentionService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.env.RETENTION_ENABLED) {
      this.logger.log("Purge automatique désactivée (RETENTION_ENABLED=false).");
      return;
    }
    this.worker = new Worker<MaintenanceJob>(
      MAINTENANCE_QUEUE_NAME,
      async (job) => {
        if (job.data.type === "retention") await this.retention.run();
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Purge en échec (${job?.id}) : ${err.message}`);
    });

    try {
      await this.queue.add(
        RETENTION_JOB,
        { type: "retention" },
        {
          jobId: RETENTION_JOB,
          repeat: { pattern: "0 3 * * *" },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Impossible de planifier la purge : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
