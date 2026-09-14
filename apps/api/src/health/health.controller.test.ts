import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import { HealthController } from "./health.controller";
import type { HealthService } from "./health.service";

function res() {
  const r = { status: vi.fn().mockReturnThis() } as unknown as Response;
  return r;
}

describe("HealthController", () => {
  it("readiness : 200 quand tout va bien", async () => {
    const svc = {
      check: vi.fn().mockResolvedValue({ status: "ok", checks: { database: "ok", redis: "ok" } }),
    } as unknown as HealthService;
    const r = res();
    await new HealthController(svc).ready(r);
    expect(r.status).toHaveBeenCalledWith(200);
  });

  it("readiness : 503 quand une dépendance est down", async () => {
    const svc = {
      check: vi.fn().mockResolvedValue({ status: "degraded", checks: { database: "down", redis: "ok" } }),
    } as unknown as HealthService;
    const r = res();
    const body = await new HealthController(svc).ready(r);
    expect(r.status).toHaveBeenCalledWith(503);
    expect(body.status).toBe("degraded");
  });

  it("liveness : ne touche aucune dépendance", () => {
    const svc = { uptimeSeconds: vi.fn().mockReturnValue(42), check: vi.fn() } as unknown as HealthService;
    const out = new HealthController(svc).live();
    expect(out).toEqual({ status: "ok", uptimeSeconds: 42 });
    expect((svc.check as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
