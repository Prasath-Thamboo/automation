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
export const QUOTE_QUEUE = Symbol("QUOTE_QUEUE");
const MAIL_QUEUE_NAME = "mail";
export const QUOTE_QUEUE_NAME = "quote-lifecycle";

/** Tâche différée de cycle de vie d'un devis (relance J+7 / J+21, expiration J+30). */
export interface QuoteJob {
  type: "reminder-j7" | "reminder-j21" | "expire";
  quoteId: string;
}

/**
 * Files d'attente BullMQ (§9.1 : emails, relances de devis, génération PDF).
 * - `mail` : envoi d'emails (un worker ici).
 * - `quote-lifecycle` : tâches différées sur les devis (worker dans QuotesModule).
 */
@Injectable()
export class QueueService {
  constructor(
    @Inject(MAIL_QUEUE) private readonly mailQueue: Queue<OutgoingMail>,
    @Inject(QUOTE_QUEUE) private readonly quoteQueue: Queue<QuoteJob>,
  ) {}

  async enqueueEmail(mail: OutgoingMail): Promise<void> {
    await this.mailQueue.add("send", mail, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }

  /** Programme une tâche sur un devis dans `delayMs` millisecondes. */
  async enqueueQuoteJob(job: QuoteJob, delayMs: number): Promise<void> {
    await this.quoteQueue.add(job.type, job, {
      delay: Math.max(0, delayMs),
      jobId: `${job.type}:${job.quoteId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 1_000,
      removeOnFail: 1_000,
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

const makeQueue = <T>(name: string) => ({
  inject: [REDIS],
  useFactory: (redis: Redis) => new Queue<T>(name, { connection: redis }),
});

@Module({
  imports: [MailModule],
  providers: [
    { provide: MAIL_QUEUE, ...makeQueue<OutgoingMail>(MAIL_QUEUE_NAME) },
    { provide: QUOTE_QUEUE, ...makeQueue<QuoteJob>(QUOTE_QUEUE_NAME) },
    QueueService,
    MailWorker,
  ],
  exports: [QueueService, QUOTE_QUEUE],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(
    @Inject(MAIL_QUEUE) private readonly mailQueue: Queue,
    @Inject(QUOTE_QUEUE) private readonly quoteQueue: Queue,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.mailQueue.close(), this.quoteQueue.close()]);
  }
}
