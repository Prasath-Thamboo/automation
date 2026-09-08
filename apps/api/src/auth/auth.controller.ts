import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import {
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  type AuthResult,
  type RequestMagicLink,
  type SessionUser,
  type VerifyMagicLink,
} from "@tando/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";
import { CurrentUser } from "./current-user.decorator";

/**
 * L'API renvoie toujours le jeton de session dans le corps de `verify`.
 * - Web : le serveur Next.js reçoit ce jeton et le pose dans un cookie httpOnly
 *   propre à l'origine du site (le web et l'API ont des origines distinctes).
 * - Mobile : l'app stocke le jeton dans expo-secure-store.
 * Les deux renvoient ensuite le jeton via `Authorization: Bearer`.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("magic-link")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ description: "Le lien a été envoyé si l'adresse est valide." })
  async requestMagicLink(
    @Body(new ZodValidationPipe(requestMagicLinkSchema)) body: RequestMagicLink,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    await this.auth.requestMagicLink(body, req.ip);
    return { ok: true };
  }

  @Post("verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ description: "Session créée ; jeton renvoyé dans le corps." })
  async verify(
    @Body(new ZodValidationPipe(verifyMagicLinkSchema)) body: VerifyMagicLink,
    @Req() req: Request,
  ): Promise<AuthResult> {
    const { user, sessionToken } = await this.auth.verify(body, req.headers["user-agent"]);
    return { user, token: sessionToken };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  @ApiOkResponse({ description: "Utilisateur de la session courante." })
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Post("sign-out")
  @ApiOkResponse({ description: "Session révoquée." })
  async signOut(@Req() req: Request): Promise<{ ok: true }> {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
    await this.auth.signOut(bearer);
    return { ok: true };
  }
}
