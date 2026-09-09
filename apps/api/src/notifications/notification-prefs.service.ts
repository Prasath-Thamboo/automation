import { Injectable } from "@nestjs/common";
import type { NotificationPrefs, UpdateNotificationPrefs } from "@tando/types";
import { PrismaService } from "../prisma/prisma.service";

/** Valeurs par défaut si l'utilisateur n'a jamais touché ses réglages (§6bis). */
export const DEFAULT_PREFS: NotificationPrefs = {
  escalations: true,
  dailySummary: false,
  dailySummaryHour: 8,
  paymentFailure: true,
  quietStart: null,
  quietEnd: null,
  timezone: "Europe/Paris",
};

@Injectable()
export class NotificationPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<NotificationPrefs> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!row) return { ...DEFAULT_PREFS };
    return {
      escalations: row.escalations,
      dailySummary: row.dailySummary,
      dailySummaryHour: row.dailySummaryHour,
      paymentFailure: row.paymentFailure,
      quietStart: row.quietStart,
      quietEnd: row.quietEnd,
      timezone: row.timezone,
    };
  }

  async update(userId: string, dto: UpdateNotificationPrefs): Promise<NotificationPrefs> {
    const current = await this.get(userId);
    const next: NotificationPrefs = { ...current, ...dto };
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...next },
      update: next,
    });
    return next;
  }
}
