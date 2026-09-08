import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import type { AuthChannel } from "@prisma/client";
import type { RequestMagicLink, SessionUser, VerifyMagicLink } from "@tando/types";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.module";
import { AuditService } from "../audit/audit.service";
import { magicLinkEmail } from "../mail/templates";
import { MagicLinkService } from "./magic-link.service";
import { SessionService } from "./session.service";

export interface VerifiedSession {
  user: SessionUser;
  sessionToken: string;
  channel: AuthChannel;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger("Auth");

  constructor(
    private readonly prisma: PrismaService,
    private readonly magicLinks: MagicLinkService,
    private readonly sessions: SessionService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Envoie un lien de connexion. Réponse identique que l'email soit connu ou non
   * (pas de fuite d'information) — l'utilisateur est créé à la première demande.
   */
  async requestMagicLink(input: RequestMagicLink, requestIp?: string): Promise<void> {
    const user = await this.prisma.user.upsert({
      where: { email: input.email },
      update: {},
      create: { email: input.email },
    });

    const link = await this.magicLinks.issue(user.id, input.channel, requestIp);
    const url = this.buildLink(input.channel, link.token);

    await this.queue.enqueueEmail(magicLinkEmail(input.email, url, link.ttlMinutes));
    await this.audit.record({
      actorUserId: user.id,
      action: "auth.magic_link.requested",
      metadata: { channel: input.channel },
    });
  }

  /** Échange un jeton de lien magique contre une session. */
  async verify(input: VerifyMagicLink, userAgent?: string): Promise<VerifiedSession> {
    const consumed = await this.magicLinks.consume(input.token);
    if (!consumed) {
      throw new BadRequestException(
        "Ce lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau depuis la page de connexion.",
      );
    }

    await this.ensureMembership(consumed.userId);

    const issued = await this.sessions.issue(consumed.userId, consumed.channel, userAgent);
    const user = await this.sessions.resolve(issued.token);
    if (!user) {
      this.logger.error(`Session émise mais non résolue pour l'utilisateur ${consumed.userId}`);
      throw new BadRequestException("La connexion n'a pas abouti. Redemandez un lien et réessayez.");
    }

    await this.audit.record({
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: "auth.session.created",
      metadata: { channel: consumed.channel },
    });

    return { user, sessionToken: issued.token, channel: consumed.channel };
  }

  async signOut(token: string | undefined): Promise<void> {
    if (token) await this.sessions.revoke(token);
  }

  /** Un utilisateur sans organisation en reçoit une (il en devient propriétaire). */
  private async ensureMembership(userId: string): Promise<void> {
    const existing = await this.prisma.membership.findFirst({
      where: { userId, deletedAt: null },
    });
    if (existing) return;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const base = slugify(user.email.split("@")[0] ?? "entreprise") || "entreprise";

    await this.prisma.organization.create({
      data: {
        name: "Mon entreprise",
        slug: `${base}-${randomSuffix()}`,
        memberships: { create: { userId, role: "owner" } },
      },
    });
  }

  private buildLink(channel: AuthChannel, token: string): string {
    if (channel === "mobile") {
      return `${this.env.MOBILE_DEEP_LINK_SCHEME}://verifier?token=${encodeURIComponent(token)}`;
    }
    return `${webBaseUrl(this.env)}/connexion/verifier?token=${encodeURIComponent(token)}`;
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 8);
}
