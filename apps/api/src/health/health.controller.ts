import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Health } from "@tando/types";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Readiness : la base et Redis répondent. **503** si dégradé — le load
   * balancer retire l'instance, l'alerting se déclenche. Le corps reste lisible.
   */
  @Get()
  @ApiOkResponse({ description: "État de la base de données et de Redis (503 si dégradé)." })
  async ready(@Res({ passthrough: true }) res: Response): Promise<Health> {
    const health = await this.health.check();
    res.status(health.status === "ok" ? 200 : 503);
    return health;
  }

  /**
   * Liveness : le process répond. Ne touche aucune dépendance — une base lente
   * ne doit pas provoquer le redémarrage de l'instance.
   */
  @Get("live")
  @ApiOkResponse({ description: "Le process est vivant." })
  live(): { status: "ok"; uptimeSeconds: number } {
    return { status: "ok", uptimeSeconds: this.health.uptimeSeconds() };
  }
}
