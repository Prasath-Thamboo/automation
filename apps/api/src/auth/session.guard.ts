import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { SessionService } from "./session.service";
import type { AuthedRequest } from "./current-user.decorator";

/**
 * Autorise la requête si elle porte une session valide, par cookie httpOnly (web)
 * ou par en-tête `Authorization: Bearer` (mobile). Sinon 401 avec un message
 * orienté action (§9.5).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Vous n'êtes pas connecté. Connectez-vous pour continuer.");

    const user = await this.sessions.resolve(token);
    if (!user) {
      throw new UnauthorizedException("Votre session a expiré. Reconnectez-vous pour continuer.");
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
