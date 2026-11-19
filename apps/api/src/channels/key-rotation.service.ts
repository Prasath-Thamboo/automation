import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SecretBox } from "./secret-box";

const BATCH = 200;

export interface RotationReport {
  /** Valeurs rechiffrées avec la clé courante. */
  conversations: number;
  endpoints: number;
  /** Valeurs illisibles (ancienne clé absente du trousseau) : laissées telles quelles. */
  unreadable: number;
  /** Plus rien à rechiffrer : `CHANNEL_SECRET_KEY_PREVIOUS` peut être retirée. */
  done: boolean;
}

interface Table {
  name: "conversations" | "endpoints";
  /** Lignes dont la valeur chiffrée n'est pas sous la clé courante, après `afterId`. */
  stale(prefix: string, afterId: string | undefined): Promise<Array<{ id: string; value: string }>>;
  /** Remplace la valeur si elle n'a pas changé entre-temps. Renvoie vrai si écrit. */
  swap(id: string, from: string, to: string): Promise<boolean>;
}

/**
 * Rotation de `CHANNEL_SECRET_KEY` (Lot 19). Rechiffre avec la clé courante
 * les adresses de réponse (`conversations.replyToEnc`) et les secrets de canal
 * (`channel_endpoints.secretEnc`) encore chiffrés avec une ancienne clé.
 * Par lots, idempotent, sans verrou : une valeur modifiée pendant le passage
 * n'est pas écrasée (`updateMany` conditionnel).
 */
@Injectable()
export class ChannelKeyRotationService {
  private readonly logger = new Logger("KeyRotation");

  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    private readonly audit: AuditService,
  ) {}

  async run(): Promise<RotationReport> {
    const prefix = `v${this.box.currentVersion}.`;
    const report: RotationReport = { conversations: 0, endpoints: 0, unreadable: 0, done: false };

    for (const table of this.tables()) {
      let afterId: string | undefined;
      for (;;) {
        const rows = await table.stale(prefix, afterId);
        if (rows.length === 0) break;
        for (const row of rows) {
          const plain = this.box.open(row.value);
          if (plain === null) {
            report.unreadable += 1;
            continue;
          }
          if (await table.swap(row.id, row.value, this.box.seal(plain))) report[table.name] += 1;
        }
        afterId = rows[rows.length - 1]?.id;
      }
    }

    report.done = report.unreadable === 0;
    const changed = report.conversations + report.endpoints;
    if (changed > 0) {
      this.logger.log(
        `Rechiffrement v${this.box.currentVersion} : ${report.conversations} conversation(s), ${report.endpoints} canal(aux).`,
      );
      await this.audit.record({
        action: "channels.key_rotated",
        metadata: { version: this.box.currentVersion, ...report },
      });
    }
    if (report.unreadable > 0) {
      this.logger.warn(
        `${report.unreadable} valeur(s) chiffrée(s) avec une clé absente de CHANNEL_SECRET_KEY_PREVIOUS — non rechiffrées.`,
      );
    } else if (changed > 0) {
      this.logger.log("Rechiffrement terminé : CHANNEL_SECRET_KEY_PREVIOUS peut être retirée.");
    }
    return report;
  }

  private tables(): Table[] {
    const page = { take: BATCH, orderBy: { id: "asc" as const } };
    return [
      {
        name: "conversations",
        stale: async (prefix, afterId) => {
          const rows = await this.prisma.conversation.findMany({
            where: {
              replyToEnc: { not: null },
              NOT: { replyToEnc: { startsWith: prefix } },
              ...(afterId ? { id: { gt: afterId } } : {}),
            },
            select: { id: true, replyToEnc: true },
            ...page,
          });
          return rows.map((r) => ({ id: r.id, value: r.replyToEnc ?? "" }));
        },
        swap: async (id, from, to) =>
          (await this.prisma.conversation.updateMany({ where: { id, replyToEnc: from }, data: { replyToEnc: to } }))
            .count > 0,
      },
      {
        name: "endpoints",
        stale: async (prefix, afterId) => {
          const rows = await this.prisma.channelEndpoint.findMany({
            where: {
              secretEnc: { not: null },
              NOT: { secretEnc: { startsWith: prefix } },
              ...(afterId ? { id: { gt: afterId } } : {}),
            },
            select: { id: true, secretEnc: true },
            ...page,
          });
          return rows.map((r) => ({ id: r.id, value: r.secretEnc ?? "" }));
        },
        swap: async (id, from, to) =>
          (await this.prisma.channelEndpoint.updateMany({ where: { id, secretEnc: from }, data: { secretEnc: to } }))
            .count > 0,
      },
    ];
  }
}
