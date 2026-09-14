import { Inject, Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

/**
 * Une ligne de log structurée par requête (§9.1 monitoring). Sert de base à
 * l'alerting log : taux de 5xx, taux de requêtes lentes, latence.
 *
 * Ne journalise que la méthode et le **chemin** (jamais la query string : elle
 * peut porter des jetons — devis, lien magique). Ignore les sondes de santé.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("Request");

  constructor(@Inject(ENV) private readonly env: Env) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.env.REQUEST_LOG_ENABLED || req.path.startsWith("/api/v1/health")) {
      return next();
    }

    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const line = `${req.method} ${req.path} -> ${res.statusCode} ${ms.toFixed(0)}ms`;
      const slow = ms >= this.env.SLOW_REQUEST_MS;

      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400 || slow) this.logger.warn(slow ? `${line} (lent)` : line);
      else this.logger.log(line);
    });

    next();
  }
}
