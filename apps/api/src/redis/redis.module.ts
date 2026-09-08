import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import IORedis, { type Redis } from "ioredis";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

export const REDIS = Symbol("REDIS");

/**
 * Connexion Redis partagée (santé + files BullMQ).
 * `maxRetriesPerRequest: null` est requis par BullMQ pour les workers.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env): Redis =>
        new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
