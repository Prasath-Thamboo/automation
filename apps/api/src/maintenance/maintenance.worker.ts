import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker, type JobsOptions } from "bullmq";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.module";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import {
  MAINTENANCE_QUEUE,
  MAINTENANCE_QUEUE_NAME,
  type MaintenanceJob,
} from "../queue/queue.module";
import { RetentionService } from "../retention/retention.service";
import { ChannelKeyRotationService } from "../channels/key-rotation.service";

const REPEAT_OPTS: JobsOptions = { removeOnComplete: true, removeOnFail: 50 };

/**
 * Seul worker de la file `maintenance` (deux workers sur la même file se
 * partageraient les jobs) :
 * - `retention` : purge quotidienne à 03:00 (Lot 18), si `RETENTION_ENABLED` ;
 * - `rekey` : rechiffrement des données de canal (Lot 19), au démarrage puis
 *   toutes les heures — ne fait rien quand tout est déjà sous la clé courante.
 * `jobId` fixes => un seul planificateur, même avec plusieurs instances.
 */
@Injectable()
export class MaintenanceWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("MaintenanceWorker");
  private worker?: Worker<MaintenanceJob>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(MAINTENANCE_QUEUE) private readonly queue: Queue<MaintenanceJob>,
    @Inject(ENV) private readonly env: Env,
    private readonly retention: RetentionService,
    private readonly rotation: ChannelKeyRotationService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker<MaintenanceJob>(
      MAINTENANCE_QUEUE_NAME,
      async (job) => {
        if (job.data.type === "retention") await this.retention.run();
        if (job.data.type === "rekey") await this.rotation.run();
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Tâche de maintenance en échec (${job?.id}) : ${err.message}`);
    });

    try {
      if (this.env.RETENTION_ENABLED) {
        await this.queue.add(
          "retention",
          { type: "retention" },
          { ...REPEAT_OPTS, jobId: "retention", repeat: { pattern: "0 3 * * *" } },
        );
      } else {
        this.logger.log("Purge automatique désactivée (RETENTION_ENABLED=false).");
      }
      await this.queue.add("rekey", { type: "rekey" }, { ...REPEAT_OPTS, jobId: "rekey", repeat: { pattern: "20 * * * *" } });
      // Un passage tout de suite : une rotation se termine sans attendre l'heure.
      await this.queue.add("rekey", { type: "rekey" }, { ...REPEAT_OPTS, jobId: `rekey-boot-${Date.now()}` });
    } catch (err) {
      this.logger.warn(
        `Impossible de planifier la maintenance : ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
