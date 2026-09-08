import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { Health } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS } from "../redis/redis.module";

const startedAt = Date.now();

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async check(): Promise<Health> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const status: Health["status"] = database === "ok" && redis === "ok" ? "ok" : "degraded";
    return {
      status,
      version: process.env.npm_package_version ?? "0.0.0",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<"ok" | "down"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "down";
    }
  }

  private async checkRedis(): Promise<"ok" | "down"> {
    try {
      const pong = await this.redis.ping();
      return pong === "PONG" ? "ok" : "down";
    } catch {
      return "down";
    }
  }
}
