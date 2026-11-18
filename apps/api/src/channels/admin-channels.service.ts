import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, type ChannelEndpoint, type ChannelKind } from "@prisma/client";
import type {
  AdminChannel,
  AdminChannelList,
  CreateAdminChannel,
  UpdateAdminChannel,
} from "@velekya/types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SecretBox } from "./secret-box";
import { ChannelsService, formatFrenchNumber } from "./channels.service";
import { normalizeEmail } from "./email-address";
import { toE164 } from "./providers/twilio";

/**
 * Back-office (Lot 12) : l'équipe Velekya raccorde les canaux d'un assistant —
 * numéro Twilio, compte WhatsApp / Instagram — après les démarches auprès du
 * fournisseur. Lecture/écriture transverse, gardée par `AdminGuard`.
 */
@Injectable()
export class AdminChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly box: SecretBox,
    private readonly channels: ChannelsService,
  ) {}

  async list(assistantId: string): Promise<AdminChannelList> {
    const found = await this.prisma.assistant.findFirst({ where: { id: assistantId, deletedAt: null } });
    if (!found) throw new NotFoundException("Assistant introuvable.");
    const assistant = await this.channels.ensureDefaults(found);
    const rows = await this.prisma.channelEndpoint.findMany({
      where: { assistantId },
      orderBy: { createdAt: "asc" },
    });
    return {
      assistant: {
        id: assistant.id,
        name: assistant.name,
        organizationId: assistant.organizationId,
        publicId: assistant.publicId,
      },
      channels: rows.map(toDto),
    };
  }

  async create(assistantId: string, dto: CreateAdminChannel, actorUserId: string): Promise<AdminChannel> {
    const assistant = await this.prisma.assistant.findFirst({ where: { id: assistantId, deletedAt: null } });
    if (!assistant) throw new NotFoundException("Assistant introuvable.");
    if (dto.kind === "formulaire") {
      throw new UnprocessableEntityException({ message: "Le formulaire est créé automatiquement." });
    }

    const address = normalizeAddress(dto.kind, dto.address);
    const settings = buildSettings(dto.kind, address, dto.display, dto.forwardTo);
    try {
      const row = await this.prisma.channelEndpoint.create({
        data: {
          organizationId: assistant.organizationId,
          assistantId,
          kind: dto.kind,
          address,
          status: dto.status,
          settings,
          secretEnc: dto.accessToken ? this.box.seal(dto.accessToken) : null,
        },
      });
      await this.audit.record({
        organizationId: assistant.organizationId,
        actorUserId,
        action: "admin.channel_created",
        target: `channel:${row.id}`,
        metadata: { kind: row.kind, status: row.status },
      });
      return toDto(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Ce canal est déjà raccordé à un assistant.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateAdminChannel, actorUserId: string): Promise<AdminChannel> {
    const row = await this.prisma.channelEndpoint.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Canal introuvable.");

    const current = (row.settings as Record<string, string> | null) ?? {};
    const settings = buildSettings(
      row.kind,
      row.address,
      dto.display ?? current.display,
      dto.forwardTo ?? current.forwardTo,
    );
    const updated = await this.prisma.channelEndpoint.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        settings,
        ...(dto.accessToken ? { secretEnc: this.box.seal(dto.accessToken) } : {}),
      },
    });
    await this.audit.record({
      organizationId: row.organizationId,
      actorUserId,
      action: "admin.channel_updated",
      target: `channel:${id}`,
      metadata: { status: updated.status, secretChanged: Boolean(dto.accessToken) },
    });
    return toDto(updated);
  }

  async remove(id: string, actorUserId: string): Promise<{ ok: true }> {
    const row = await this.prisma.channelEndpoint.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Canal introuvable.");
    if (row.kind === "formulaire") {
      throw new UnprocessableEntityException({ message: "Désactivez le formulaire plutôt que de le supprimer." });
    }
    await this.prisma.channelEndpoint.delete({ where: { id } });
    await this.audit.record({
      organizationId: row.organizationId,
      actorUserId,
      action: "admin.channel_deleted",
      target: `channel:${id}`,
      metadata: { kind: row.kind },
    });
    return { ok: true };
  }
}

function normalizeAddress(kind: ChannelKind, raw: string): string {
  if (kind === "sms" || kind === "telephone") {
    const n = toE164(raw);
    if (!n) throw new UnprocessableEntityException({ message: "Numéro illisible (format attendu : +33…)." });
    return n;
  }
  if (kind === "email") {
    const e = normalizeEmail(raw);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      throw new UnprocessableEntityException({ message: "Adresse email invalide." });
    }
    return e;
  }
  const id = raw.trim();
  if (!/^\d{5,30}$/.test(id)) {
    throw new UnprocessableEntityException({
      message: "Identifiant Meta attendu (chiffres : phone_number_id ou id du compte Instagram).",
    });
  }
  return id;
}

function buildSettings(
  kind: ChannelKind,
  address: string,
  display: string | undefined,
  forwardTo: string | undefined,
): Prisma.InputJsonObject {
  const settings: Record<string, string> = {};
  const shown = display?.trim();
  if (shown) settings.display = shown;
  else if (kind === "sms" || kind === "telephone") settings.display = formatFrenchNumber(address);
  if (kind === "telephone" && forwardTo?.trim()) {
    const n = toE164(forwardTo);
    if (!n) throw new UnprocessableEntityException({ message: "Numéro de renvoi illisible." });
    settings.forwardTo = n;
  }
  return settings;
}

function toDto(row: ChannelEndpoint): AdminChannel {
  const settings = (row.settings as { display?: string; forwardTo?: string } | null) ?? {};
  return {
    id: row.id,
    kind: row.kind,
    address: row.address,
    status: row.status,
    display: settings.display ?? row.address,
    forwardTo: settings.forwardTo ?? null,
    hasSecret: Boolean(row.secretEnc),
    createdAt: row.createdAt.toISOString(),
  };
}
