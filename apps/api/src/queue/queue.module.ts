import {
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.module";
import { MailModule } from "../mail/mail.module";
import { MailService, type OutgoingMail } from "../mail/mail.service";

export const MAIL_QUEUE = Symbol("MAIL_QUEUE");
const MAIL_QUEUE_NAME = "mail";

/**
 * Files d'attente BullMQ (§9.1 : emails, relances de devis, génération PDF).
 * Au Lot 0, seule la file « mail » existe : l'API met l'email de lien magique en
 * file, un worker l'envoie. Découplage réseau <-> envoi.
 */
@Injectable()
export class QueueService {
  constructor(@Inject(MAIL_QUEUE) private readonly mailQueue: Queue<OutgoingMail>) {}

  async enqueueEmail(mail: OutgoingMail): Promise<void> {
    await this.mailQueue.add("send", mail, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }
}

@Injectable()
export class MailWorker implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger("MailWorker");
  private worker?: Worker<OutgoingMail>;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<OutgoingMail>(
      MAIL_QUEUE_NAME,
      async (job) => {
        await this.mail.send(job.data);
      },
      { connection: this.redis },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.warn(`Échec d'envoi (job ${job?.id}, tentative ${job?.attemptsMade}) : ${err.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}

@Module({
  imports: [MailModule],
  providers: [
    {
      provide: MAIL_QUEUE,
      inject: [REDIS],
      useFactory: (redis: Redis) =>
        new Queue<OutgoingMail>(MAIL_QUEUE_NAME, { connection: redis }),
    },
    QueueService,
    MailWorker,
  ],
  exports: [QueueService],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(MAIL_QUEUE) private readonly mailQueue: Queue) {}

  async onApplicationShutdown(): Promise<void> {
    await this.mailQueue.close();
  }
}
