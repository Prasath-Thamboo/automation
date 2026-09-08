import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { SessionUser } from "@tando/types";

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

/** Injecte l'utilisateur de session. À utiliser derrière `SessionGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.user) {
      throw new Error("CurrentUser utilisé sans SessionGuard");
    }
    return request.user;
  },
);
