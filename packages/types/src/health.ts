import { z } from "zod";

export const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  uptimeSeconds: z.number(),
  checks: z.object({
    database: z.enum(["ok", "down"]),
    redis: z.enum(["ok", "down"]),
  }),
});
export type Health = z.infer<typeof healthSchema>;
