import { randomBytes } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { SecretBox } from "../secret-box";
import { type ChannelSender, type OutboundMessage, PermanentDeliveryError } from "../channel-sender";

/**
 * Codes Meta définitifs. 131047 / 2018278 : plus de 24 h depuis le dernier
 * message du client — Meta interdit alors une réponse libre (il faudrait un
 * message modèle validé, hors périmètre). 131026 : destinataire injoignable.
 * 190 : jeton du canal expiré ou révoqué (à renouveler par l'équipe Tando).
 */
const PERMANENT_CODES = new Set([100, 190, 131026, 131047, 131051, 551]);
const OUTSIDE_WINDOW = new Set([131047, 2018278]);

/** API Instagram (connexion Instagram) — l'API Graph Facebook sert WhatsApp. */
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com/v21.0";

/**
 * Réponses WhatsApp et Instagram (Lot 12), avec le jeton d'accès propre au
 * canal (chiffré dans `ChannelEndpoint.secretEnc`). `CHANNELS_DELIVERY=fake` : simulé.
 */
@Injectable()
export class MetaSender implements ChannelSender {
  readonly kinds = ["whatsapp", "instagram"] as const;
  private readonly logger = new Logger("MetaSender");

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly box: SecretBox,
  ) {}

  async send(msg: OutboundMessage): Promise<{ ref: string | null }> {
    const { endpoint } = msg;
    if (this.env.CHANNELS_DELIVERY === "fake") {
      this.logger.log(`[simulé] ${endpoint.kind} via ${endpoint.address} (${msg.text.length} car.)`);
      return { ref: `fake_${endpoint.kind}_${randomBytes(8).toString("hex")}` };
    }

    const token = this.box.open(endpoint.secretEnc);
    if (!token) throw new PermanentDeliveryError("Jeton d'accès du canal manquant.");

    const settings = (endpoint.settings as { graphUrl?: string } | null) ?? {};
    const [url, body] =
      endpoint.kind === "whatsapp"
        ? [
            `${this.env.META_GRAPH_URL}/${endpoint.address}/messages`,
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: msg.to,
              type: "text",
              text: { body: msg.text.slice(0, 4096), preview_url: false },
            },
          ]
        : [
            `${settings.graphUrl ?? INSTAGRAM_GRAPH_URL}/${endpoint.address}/messages`,
            { recipient: { id: msg.to }, message: { text: msg.text.slice(0, 1000) } },
          ];

    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      message_id?: string;
      error?: { code?: number; error_subcode?: number; message?: string };
    };
    if (res.ok) return { ref: data.messages?.[0]?.id ?? data.message_id ?? null };

    const code = data.error?.code;
    const sub = data.error?.error_subcode;
    if ((code && OUTSIDE_WINDOW.has(code)) || (sub && OUTSIDE_WINDOW.has(sub))) {
      throw new PermanentDeliveryError(
        "Plus de 24 h depuis le dernier message du client : réponse libre impossible sur ce canal.",
      );
    }
    if (code && PERMANENT_CODES.has(code)) throw new PermanentDeliveryError(`Message refusé (${code}).`);
    throw new Error(`Meta a répondu ${res.status}${code ? ` (${code})` : ""}.`);
  }
}
