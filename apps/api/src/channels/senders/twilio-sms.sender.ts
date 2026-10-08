import { randomBytes } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { type ChannelSender, type OutboundMessage, PermanentDeliveryError } from "../channel-sender";
import { canReceiveSms } from "../providers/twilio";

/** Codes d'erreur Twilio définitifs : numéro invalide, désinscrit, non joignable par SMS. */
const PERMANENT_CODES = new Set([21211, 21408, 21610, 21612, 21614]);
/** Un SMS long est découpé et facturé par segment : on reste raisonnable. */
const MAX_SMS = 640;

/**
 * Réponses par SMS (Lot 12), depuis le numéro SMS de l'assistant — y compris
 * le SMS qui suit un appel manqué. `CHANNELS_DELIVERY=fake` : simulé.
 */
@Injectable()
export class TwilioSmsSender implements ChannelSender {
  readonly kinds = ["sms"] as const;
  private readonly logger = new Logger("TwilioSms");

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send(msg: OutboundMessage): Promise<{ ref: string | null }> {
    if (!canReceiveSms(msg.to)) throw new PermanentDeliveryError("Ce numéro ne reçoit pas de SMS.");
    const body = msg.text.length > MAX_SMS ? `${msg.text.slice(0, MAX_SMS - 1)}…` : msg.text;

    if (this.env.CHANNELS_DELIVERY === "fake") {
      this.logger.log(`[simulé] SMS de ${msg.endpoint.address} (${body.length} car.)`);
      return { ref: `fake_SM${randomBytes(8).toString("hex")}` };
    }

    const sid = this.env.TWILIO_ACCOUNT_SID;
    const token = this.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new PermanentDeliveryError("Envoi de SMS non configuré.");

    const res = await fetch(`${this.env.TWILIO_API_URL}/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: msg.to, From: msg.endpoint.address, Body: body }),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
    if (res.ok) return { ref: data.sid ?? null };
    if (data.code && PERMANENT_CODES.has(data.code)) {
      throw new PermanentDeliveryError(`SMS refusé (${data.code}).`);
    }
    // 429 / 5xx / autre : on réessaie (la file gère le délai).
    throw new Error(`Twilio a répondu ${res.status}${data.code ? ` (${data.code})` : ""}.`);
  }
}
