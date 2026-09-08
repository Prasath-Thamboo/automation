import { describe, expect, it, vi } from "vitest";
import { HealthService } from "./health.service";

const prismaOk = { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
const prismaDown = { $queryRaw: vi.fn().mockRejectedValue(new Error("no db")) };
const redisOk = { ping: vi.fn().mockResolvedValue("PONG") };
const redisDown = { ping: vi.fn().mockRejectedValue(new Error("no redis")) };

describe("HealthService", () => {
  it("status ok quand la base et Redis répondent", async () => {
    const svc = new HealthService(prismaOk as never, redisOk as never);
    const health = await svc.check();
    expect(health.status).toBe("ok");
    expect(health.checks).toEqual({ database: "ok", redis: "ok" });
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("status degraded si un composant est down", async () => {
    const svc = new HealthService(prismaOk as never, redisDown as never);
    const health = await svc.check();
    expect(health.status).toBe("degraded");
    expect(health.checks.redis).toBe("down");
  });

  it("status degraded si la base est down", async () => {
    const svc = new HealthService(prismaDown as never, redisOk as never);
    const health = await svc.check();
    expect(health.status).toBe("degraded");
    expect(health.checks.database).toBe("down");
  });
});
