import { Inject, Injectable } from "@nestjs/common";
import type { AuthChannel } from "@prisma/client";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { generateToken, hashToken } from "./tokens";

export interface IssuedMagicLink {
  token: string;
  expiresAt: Date;
  ttlMinutes: number;
}

@Injectable()
export class MagicLinkService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Émet un lien magique pour un utilisateur. Renvoie le jeton en clair (pour l'email). */
  async issue(userId: string, channel: AuthChannel, requestIp?: string): Promise<IssuedMagicLink> {
    const token = generateToken();
    const ttlSeconds = this.env.MAGIC_LINK_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.magicLink.create({
      data: { userId, channel, tokenHash: hashToken(token), expiresAt, requestIp },
    });

    return { token, expiresAt, ttlMinutes: Math.round(ttlSeconds / 60) };
  }

  /**
   * Consomme un lien magique : le marque utilisé de façon atomique et renvoie
   * `{ userId, channel }`. `null` si le jeton est inconnu, expiré ou déjà utilisé.
   */
  async consume(token: string): Promise<{ userId: string; channel: AuthChannel } | null> {
    const link = await this.prisma.magicLink.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!link || link.consumedAt || link.expiresAt <= new Date()) return null;

    const claimed = await this.prisma.magicLink.updateMany({
      where: { id: link.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    return { userId: link.userId, channel: link.channel };
  }
}
