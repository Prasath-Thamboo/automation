import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ENV } from "../config/config.module";
import { Inject } from "@nestjs/common";
import type { Env } from "../config/env";
import { SessionService } from "./session.service";
import type { AuthedRequest } from "./current-user.decorator";

/**
 * Réservé au personnel Tando : session valide ET rôle `admin`. Utilisé par le
 * back-office (§9.1 : section protégée) — catalogue, missions, prix, clients.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Vous n'êtes pas connecté.");

    const user = await this.sessions.resolve(token);
    if (!user) throw new UnauthorizedException("Votre session a expiré. Reconnectez-vous.");
    if (user.role !== "admin") {
      throw new ForbiddenException("Cet espace est réservé à l'équipe Tando.");
    }

    request.user = user;
    return true;
  }

  private extractToken(request: AuthedRequest): string | undefined {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7).trim() || undefined;
    const cookies = (request as unknown as { cookies?: Record<string, string> }).cookies;
    return cookies?.[this.env.SESSION_COOKIE];
  }
}
