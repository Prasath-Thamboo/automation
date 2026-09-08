import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiError } from "@tando/types";

/**
 * Normalise toutes les erreurs vers la forme `ApiError` de `@tando/types` :
 * `{ statusCode, error, message, fields? }`. Le `message` est toujours orienté
 * action et sans jargon (§9.5) ; les détails techniques restent dans les logs.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = this.toApiError(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(body.statusCode).json(body);
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        return { statusCode: status, error: exception.name, message: payload };
      }

      const record = payload as Record<string, unknown>;
      const rawMessage = record.message;
      const message =
        typeof rawMessage === "string"
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.join(" ")
            : "Une erreur est survenue. Réessayez dans un instant.";

      return {
        statusCode: status,
        error: typeof record.error === "string" ? record.error : exception.name,
        message,
        fields: this.asFields(record.fields),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "InternalServerError",
      message: "Une erreur est survenue de notre côté. Réessayez dans un instant.",
    };
  }

  private asFields(value: unknown): ApiError["fields"] {
    if (!value || typeof value !== "object") return undefined;
    const out: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(val)) out[key] = val.map(String);
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
}
