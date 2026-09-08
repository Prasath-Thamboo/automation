import { Inject, Injectable } from "@nestjs/common";
import type { AuthChannel } from "@prisma/client";
import type { SessionUser } from "@tando/types";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { generateToken, hashToken } from "./tokens";

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Crée une session et renvoie le jeton en clair (à ne jamais persister ailleurs). */
  async issue(userId: string, channel: AuthChannel, userAgent?: string): Promise<IssuedSession> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.env.SESSION_TTL_SECONDS * 1000);
    await this.prisma.session.create({
      data: {
        userId,
        channel,
        userAgent: userAgent?.slice(0, 400),
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  /** Résout un jeton de session en utilisateur de session, ou `null` si invalide. */
  async resolve(token: string): Promise<SessionUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          include: {
            memberships: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
              include: { organization: true },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
    if (session.user.deletedAt) return null;

    const membership = session.user.memberships.find((m) => !m.organization.deletedAt);
    if (!membership) return null;

    void this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    return {
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
