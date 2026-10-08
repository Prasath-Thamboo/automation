import { randomBytes } from "node:crypto";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, type Assistant, type ChannelEndpoint, type ChannelKind } from "@prisma/client";
import type {
  AssistantChannels,
  ChannelView,
  FormMessage,
  FormReply,
  PublicFormInfo,
} from "@tando/types";
import { ENV } from "../config/config.module";
import { webBaseUrl, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { RuntimeService } from "../assistants/runtime.service";
import { newPublicId } from "../team/public-id";
import { inboxLocalPart, normalizeEmail } from "./email-address";
import { parseBrevoInbound } from "./providers/brevo-inbound";
import {
  EMPTY_TWIML,
  canReceiveSms,
  dialTwiml,
  isCallableNumber,
  isOptOut,
  sayTwiml,
} from "./providers/twilio";
import { parseMetaWebhook } from "./providers/meta";
import { CALL_UNAVAILABLE, callMessage, missedCallSms } from "./channel-texts";

/** Ordre d'affichage des canaux côté client. */
const ORDER: ChannelKind[] = ["telephone", "sms", "email", "whatsapp", "instagram", "formulaire"];

/**
 * Canaux de réception (Lot 12) : points d'arrivée par assistant, réception
 * normalisée vers le moteur, dédoublonnage des webhooks fournisseurs.
 */
@Injectable()
export class ChannelsService {
  private readonly logger = new Logger("Channels");

  constructor(
    private readonly prisma: PrismaService,
    private readonly runtime: RuntimeService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ── Points d'arrivée ────────────────────────────────────────────────────

  /**
   * Crée les canaux fournis d'office : le formulaire (adresse = publicId) et
   * l'adresse email de réception. Les autres sont raccordés par l'équipe Tando.
   */
  async ensureDefaults(assistant: Assistant): Promise<Assistant & { publicId: string }> {
    const a = assistant.publicId
      ? assistant
      : await this.prisma.assistant.update({
          where: { id: assistant.id },
          data: { publicId: newPublicId() },
        });
    const publicId = a.publicId as string;

    const existing = await this.prisma.channelEndpoint.findMany({
      where: { assistantId: a.id, kind: { in: ["formulaire", "email"] } },
      select: { kind: true },
    });
    const has = new Set(existing.map((e) => e.kind));

    if (!has.has("formulaire")) {
      await this.createIgnoringRace({
        organizationId: a.organizationId,
        assistantId: a.id,
        kind: "formulaire",
        address: publicId,
        status: "actif",
      });
    }
    if (!has.has("email")) {
      const org = await this.prisma.organization.findUnique({
        where: { id: a.organizationId },
        select: { name: true },
      });
      const establishment = (a.establishment as { name?: string } | null)?.name?.trim();
      // Collision improbable (suffixe aléatoire) : quelques essais suffisent.
      for (let i = 0; i < 5; i++) {
        const address = normalizeEmail(
          `${inboxLocalPart(establishment || org?.name || "accueil")}@${this.env.INBOUND_EMAIL_DOMAIN}`,
        );
        const created = await this.createIgnoringRace({
          organizationId: a.organizationId,
          assistantId: a.id,
          kind: "email",
          address,
          status: "actif",
          settings: { display: address },
        });
        if (created) break;
      }
    }
    return { ...a, publicId };
  }

  private async createIgnoringRace(
    data: Prisma.ChannelEndpointUncheckedCreateInput,
  ): Promise<ChannelEndpoint | null> {
    try {
      return await this.prisma.channelEndpoint.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
      throw error;
    }
  }

  /** Vue client : par où ses clients joignent l'assistant. */
  async forClient(organizationId: string, assistantId: string): Promise<AssistantChannels> {
    const found = await this.prisma.assistant.findFirst({
      where: { id: assistantId, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException("Cet assistant n'existe pas.");
    const assistant = await this.ensureDefaults(found);

    const endpoints = await this.prisma.channelEndpoint.findMany({
      where: { assistantId, status: { not: "desactive" } },
    });
    const formUrl = `${webBaseUrl(this.env)}/formulaire/${assistant.publicId}`;
    const channels: ChannelView[] = endpoints
      .sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind))
      .map((e) => ({
        kind: e.kind,
        status: e.status,
        display: e.kind === "formulaire" ? formUrl : displayOf(e),
      }));

    return {
      channels,
      formUrl,
      formSnippet:
        `<iframe src="${formUrl}" title="Écrivez-nous" loading="lazy" ` +
        `style="width:100%;max-width:480px;height:600px;border:0"></iframe>`,
    };
  }

  /** Point d'arrivée actif pour un identifiant côté canal, ou `null`. */
  async findEndpoint(kind: ChannelKind, address: string) {
    const endpoint = await this.prisma.channelEndpoint.findUnique({
      where: { kind_address: { kind, address } },
      include: { assistant: true },
    });
    if (!endpoint || endpoint.status !== "actif" || endpoint.assistant.deletedAt) return null;
    return endpoint;
  }

  /**
   * Dédoublonne un évènement fournisseur (les webhooks peuvent être rejoués).
   * `true` : première réception, à traiter.
   */
  async firstDelivery(provider: string, eventId: string, type: string): Promise<boolean> {
    try {
      await this.prisma.webhookEvent.create({
        data: { id: `${provider}:${eventId}`.slice(0, 250), provider, type, processedAt: new Date() },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }

  // ── Email (Brevo) ───────────────────────────────────────────────────────

  /** Lot d'emails reçus sur le domaine de réception. Renvoie le nombre traité. */
  async receiveEmails(payload: unknown): Promise<number> {
    const mailFromDomain = /@([^>\s]+)/.exec(this.env.MAIL_FROM)?.[1];
    const ownDomains = [this.env.INBOUND_EMAIL_DOMAIN, ...(mailFromDomain ? [mailFromDomain] : [])];
    const { emails, skipped } = parseBrevoInbound(payload, ownDomains);
    if (skipped.length) this.logger.log(`Emails ignorés : ${skipped.join(", ")}`);

    let handled = 0;
    for (const email of emails) {
      let endpoint = null;
      for (const address of email.recipients) {
        endpoint = await this.findEndpoint("email", address);
        if (endpoint) break;
      }
      if (!endpoint) continue;
      if (!(await this.firstDelivery("brevo", email.eventId, "inbound-email"))) continue;

      await this.runtime.receive({
        assistant: endpoint.assistant,
        channel: "email",
        endpointId: endpoint.id,
        from: email.replyTo,
        replyTo: email.replyTo,
        customerLabel: email.firstName ?? "Un client",
        text: email.subject ? `${email.subject}\n\n${email.text}` : email.text,
        deliverReplies: true,
        thread: {
          subject: email.subject,
          ...(email.messageId ? { messageId: email.messageId } : {}),
        },
      });
      handled++;
    }
    return handled;
  }

  // ── SMS et appels (Twilio) ──────────────────────────────────────────────

  /** SMS reçu sur le numéro de l'assistant. */
  async receiveSms(p: Record<string, string>): Promise<void> {
    const body = (p.Body ?? "").trim();
    const sid = p.MessageSid ?? p.SmsSid;
    if (!p.To || !isCallableNumber(p.From) || !body || !sid || isOptOut(body)) return;

    const endpoint = await this.findEndpoint("sms", p.To);
    if (!endpoint) return;
    if (!(await this.firstDelivery("twilio", sid, "inbound-sms"))) return;

    await this.runtime.receive({
      assistant: endpoint.assistant,
      channel: "sms",
      endpointId: endpoint.id,
      from: p.From,
      replyTo: p.From,
      customerLabel: "Un client",
      text: body.slice(0, 4000),
      deliverReplies: true,
    });
  }

  /**
   * Appel entrant : fait sonner le patron s'il a demandé un renvoi, sinon
   * traite l'appel comme manqué. Renvoie la réponse vocale (TwiML).
   */
  async incomingCall(p: Record<string, string>, afterDialUrl: string): Promise<string> {
    const endpoint = await this.findEndpoint("telephone", p.To ?? "");
    if (!endpoint) return sayTwiml(CALL_UNAVAILABLE);
    const forwardTo = (endpoint.settings as { forwardTo?: string } | null)?.forwardTo;
    if (forwardTo && p.From !== forwardTo) return dialTwiml(forwardTo, endpoint.address, afterDialUrl);
    return this.missedCall(endpoint, p);
  }

  /** Fin de la sonnerie chez le patron : décroché, rien à faire ; sinon, appel manqué. */
  async afterDial(p: Record<string, string>): Promise<string> {
    if (p.DialCallStatus === "completed") return EMPTY_TWIML;
    const endpoint = await this.findEndpoint("telephone", p.To ?? "");
    if (!endpoint) return EMPTY_TWIML;
    return this.missedCall(endpoint, p);
  }

  private async missedCall(
    endpoint: ChannelEndpoint & { assistant: Assistant },
    p: Record<string, string>,
  ): Promise<string> {
    const { assistant } = endpoint;
    const name = establishmentName(assistant);
    const from = isCallableNumber(p.From) ? p.From : null;

    let sms: { endpointId: string; text: string } | null = null;
    if (assistant.state === "au_travail" && canReceiveSms(from ?? undefined)) {
      const smsEndpoint = await this.prisma.channelEndpoint.findFirst({
        where: { assistantId: assistant.id, kind: "sms", status: "actif" },
      });
      if (smsEndpoint) sms = { endpointId: smsEndpoint.id, text: missedCallSms(name) };
    }

    // Twilio peut rappeler deux fois pour le même appel : on ne consigne qu'une fois.
    if (!p.CallSid || (await this.firstDelivery("twilio", p.CallSid, "missed-call"))) {
      await this.runtime.missedCall({
        assistant,
        from,
        callerDisplay: from ? formatFrenchNumber(from) : "numéro masqué",
        sms,
      });
    }
    return sayTwiml(callMessage(name, Boolean(sms)));
  }

  // ── WhatsApp et Instagram (Meta) ────────────────────────────────────────

  async receiveMeta(payload: unknown): Promise<void> {
    for (const m of parseMetaWebhook(payload)) {
      const endpoint = await this.findEndpoint(m.kind, m.address);
      if (!endpoint) continue;
      if (!(await this.firstDelivery("meta", m.eventId, `inbound-${m.kind}`))) continue;
      await this.runtime.receive({
        assistant: endpoint.assistant,
        channel: m.kind,
        endpointId: endpoint.id,
        from: m.from,
        replyTo: m.from,
        customerLabel: m.firstName ?? "Un client",
        text: m.text,
        deliverReplies: true,
      });
    }
  }

  // ── Formulaire du site ──────────────────────────────────────────────────

  async formInfo(publicId: string): Promise<PublicFormInfo> {
    const endpoint = await this.findEndpoint("formulaire", publicId);
    if (!endpoint) throw new NotFoundException("Ce formulaire n'est plus disponible.");
    return {
      establishment: establishmentName(endpoint.assistant),
      assistantName: endpoint.assistant.name,
      open: endpoint.assistant.state === "au_travail",
    };
  }

  async formMessage(publicId: string, dto: FormMessage): Promise<FormReply> {
    const endpoint = await this.findEndpoint("formulaire", publicId);
    if (!endpoint) throw new NotFoundException("Ce formulaire n'est plus disponible.");

    const sessionId = dto.sessionId ?? randomBytes(16).toString("base64url");
    // Piège à robots rempli : on fait comme si de rien n'était.
    if (dto.website) return { sessionId, reply: null, status: "handled" };

    const email = dto.email ? normalizeEmail(dto.email) : null;
    const result = await this.runtime.receive({
      assistant: endpoint.assistant,
      channel: "formulaire",
      endpointId: endpoint.id,
      from: sessionId,
      replyTo: email,
      customerLabel: dto.name?.trim() || "Un visiteur du site",
      text: dto.text,
      deliverReplies: false,
    });
    return {
      sessionId,
      reply: result.reply || null,
      status: result.status,
    };
  }
}

/** Nom sous lequel l'assistant parle aux clients : l'établissement, sinon son prénom. */
function establishmentName(a: Assistant): string {
  return (a.establishment as { name?: string } | null)?.name?.trim() || a.name;
}

function displayOf(e: ChannelEndpoint): string {
  const settings = (e.settings as { display?: string } | null) ?? {};
  if (settings.display) return settings.display;
  if (e.kind === "sms" || e.kind === "telephone") return formatFrenchNumber(e.address);
  return e.address;
}

/** +33612345678 → 06 12 34 56 78 ; autres pays : tel quel. */
export function formatFrenchNumber(e164: string): string {
  const m = /^\+33(\d{9})$/.exec(e164);
  if (!m) return e164;
  return `0${m[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}
