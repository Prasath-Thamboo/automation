import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { NeedsAssessment } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { hashToken } from "../auth/tokens";

export interface AssessmentRequest extends Request {
  assessment?: NeedsAssessment;
}

/** Résout le questionnaire courant depuis son jeton de reprise
 *  (`Authorization: Bearer` ou `?token=`). Anonyme : pas de session utilisateur. */
@Injectable()
export class AssessmentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AssessmentRequest>();
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
    const token = bearer || (typeof req.query.token === "string" ? req.query.token : undefined);
    if (!token) throw new UnauthorizedException("Lien de reprise manquant ou invalide.");

    const assessment = await this.prisma.needsAssessment.findFirst({
      where: { resumeTokenHash: hashToken(token), deletedAt: null },
    });
    if (!assessment) {
      throw new UnauthorizedException("Ce lien de reprise n'est plus valide. Recommencez le questionnaire.");
    }
    req.assessment = assessment;
    return true;
  }
}
