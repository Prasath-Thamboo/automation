import { Inject, Injectable, Logger } from "@nestjs/common";
import type { RegisterPushToken } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { QueueService, type PushJob } from "../queue/queue.module";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import { NotificationPrefsService } from "./notification-prefs.service";
import { isWithinQuietHours, localHour, localDateKey } from "./quiet-hours";
import { sendExpoPush, looksLikeExpoToken, type ExpoPushMessage } from "./expo-push";

type PrefKey = "escalations" | "paymentFailure";

interface OutgoingNotice {
  organizationId: string;
  prefKey: PrefKey;
  title: string;
  body: string;
  data: Record<string, string>;
  /** Vitale = ignore les heures de silence (aucune notification vitale au MVP). */
  vital?: boolean;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger("Push");

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly prefs: NotificationPrefsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ── Enregistrement d'appareil ──────────────────────────────────────────

  async registerToken(
    userId: string,
    organizationId: string,
    dto: RegisterPushToken,
  ): Promise<void> {
    if (!looksLikeExpoToken(dto.token)) {
      // On enregistre quand même : un token brut APNs/FCM peut arriver en dev.
      this.logger.debug(`Jeton push au format inattendu pour l'utilisateur ${userId}.`);
    }
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: {
        token: dto.token,
        userId,
        organizationId,
        platform: dto.platform,
        deviceName: dto.deviceName ?? null,
      },
      update: {
        userId,
        organizationId,
        platform: dto.platform,
        deviceName: dto.deviceName ?? null,
        disabledAt: null,
        lastSeenAt: new Date(),
      },
    });
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
  }

  // ── Déclencheurs métier ────────────────────────────────────────────────

  /** L'assistant n'a pas su traiter une demande (§6bis « À valider »). */
  async notifyEscalation(input: {
    organizationId: string;
    assistantName: string;
    question: string;
    escalationId: string;
  }): Promise<void> {
    await this.notifyOrgOwners({
      organizationId: input.organizationId,
      prefKey: "escalations",
      title: `${input.assistantName} a besoin de vous`,
      body: trim(input.question, 140),
      data: { screen: "escalation", id: input.escalationId },
    });
  }

  /** Un paiement d'abonnement a échoué. */
  async notifyPaymentFailure(input: {
    organizationId: string;
    invoiceNumber: string;
  }): Promise<void> {
    await this.notifyOrgOwners({
      organizationId: input.organizationId,
      prefKey: "paymentFailure",
      title: "Un paiement n'est pas passé",
      body: `La facture ${input.invoiceNumber} n'a pas pu être réglée. Ouvrez l'app pour la régulariser.`,
      data: { screen: "documents" },
    });
  }

  private async notifyOrgOwners(notice: OutgoingNotice): Promise<void> {
    const owners = await this.prisma.membership.findMany({
      where: { organizationId: notice.organizationId, role: "owner", deletedAt: null },
      select: { userId: true },
    });
    const now = new Date();
    const recipients: string[] = [];

    for (const { userId } of owners) {
      const p = await this.prefs.get(userId);
      if (!p[notice.prefKey]) continue;
      if (!notice.vital && isWithinQuietHours(now, p.timezone, p.quietStart, p.quietEnd)) continue;
      recipients.push(userId);
    }
    if (recipients.length === 0) return;

    await this.queue.enqueuePush({
      type: "send",
      userIds: recipients,
      title: notice.title,
      body: notice.body,
      data: notice.data,
    });
  }

  // ── Exécuté par le worker (PushWorker) ─────────────────────────────────

  /** Livre effectivement un message à tous les appareils actifs des destinataires. */
  async dispatch(job: PushJob): Promise<void> {
    if (!job.userIds?.length || !job.title || !job.body) return;

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: job.userIds }, disabledAt: null },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    if (!this.env.PUSH_ENABLED) {
      this.logger.log(
        `PUSH_ENABLED=false — ${tokens.length} notification(s) « ${job.title} » non envoyée(s).`,
      );
      return;
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: job.title!,
      body: job.body!,
      data: job.data ?? {},
      sound: "default",
      priority: "high",
      channelId: "default",
    }));

    const { invalidTokens } = await sendExpoPush(
      this.env.EXPO_PUSH_URL,
      messages,
      this.env.EXPO_ACCESS_TOKEN,
    );

    if (invalidTokens.length > 0) {
      await this.prisma.pushToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { disabledAt: new Date() },
      });
      this.logger.debug(`${invalidTokens.length} jeton(s) push désactivé(s) (appareil injoignable).`);
    }

    await this.audit.record({
      action: "push.sent",
      metadata: { recipients: job.userIds.length, devices: messages.length, kind: job.data?.screen },
    });
  }

  /**
   * Réveil horaire : envoie le résumé de la veille aux utilisateurs qui l'ont
   * activé et dont l'heure locale correspond à leur `dailySummaryHour`.
   */
  async runDailySummaryTick(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.notificationPreference.findMany({
      where: { dailySummary: true },
    });

    for (const row of rows) {
      if (localHour(now, row.timezone) !== row.dailySummaryHour) continue;
      if (isWithinQuietHours(now, row.timezone, row.quietStart, row.quietEnd)) continue;

      const orgIds = (
        await this.prisma.membership.findMany({
          where: { userId: row.userId, deletedAt: null },
          select: { organizationId: true },
        })
      ).map((m) => m.organizationId);
      if (orgIds.length === 0) continue;

      const since = new Date(now.getTime() - 24 * 3_600_000);
      const [handled, pending] = await Promise.all([
        this.prisma.conversation.count({
          where: { organizationId: { in: orgIds }, lastMessageAt: { gte: since } },
        }),
        this.prisma.escalation.count({
          where: { organizationId: { in: orgIds }, status: "ouverte" },
        }),
      ]);

      if (handled === 0 && pending === 0) continue;

      const body =
        pending > 0
          ? `${handled} échange(s) gérés, ${pending} à valider.`
          : `${handled} échange(s) gérés. Rien ne vous attend.`;

      await this.queue.enqueuePush(
        {
          type: "send",
          userIds: [row.userId],
          title: "Le résumé d'hier",
          body,
          data: { screen: "today" },
        },
        { jobId: `daily_${row.userId}_${localDateKey(now, row.timezone)}` },
      );
    }
  }
}

function trim(s: string, max: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
