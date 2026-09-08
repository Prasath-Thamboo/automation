import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  action: string;
  organizationId?: string | null;
  actorUserId?: string | null;
  target?: string | null;
  /** Contexte non sensible uniquement — jamais d'email/téléphone en clair (§9.4). */
  metadata?: Prisma.InputJsonValue;
}

/**
 * Journal d'audit des actions sensibles (§9.2 / §9.4). Immuable : on n'écrit
 * jamais de mise à jour. Un échec d'écriture n'interrompt jamais la requête.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger("Audit");

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          organizationId: entry.organizationId ?? null,
          actorUserId: entry.actorUserId ?? null,
          target: entry.target ?? null,
          metadata: entry.metadata ?? {},
        },
      });
    } catch (error) {
      this.logger.warn(
        `Impossible d'écrire l'entrée d'audit « ${entry.action} » : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
