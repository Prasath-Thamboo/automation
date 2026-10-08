import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SecretBox } from "./secret-box";
import { CHANNEL_SENDERS, type ChannelSender, PermanentDeliveryError } from "./channel-sender";

/**
 * Remise des messages en attente (`Message.delivery = en_attente`) au client
 * final, par le canal d'arrivée de la conversation. Appelé par le worker de la
 * file `channel-out`.
 */
@Injectable()
export class ChannelDeliveryService {
  private readonly logger = new Logger("ChannelDelivery");

  constructor(
    private readonly prisma: PrismaService,
    private readonly box: SecretBox,
    @Inject(CHANNEL_SENDERS) private readonly senders: ChannelSender[],
  ) {}

  /** Lève une erreur « réessayable » ; les échecs définitifs sont marqués `echec`. */
  async deliver(messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { endpoint: true, assistant: true } } },
    });
    if (!message || message.delivery !== "en_attente") return;

    const { conversation } = message;
    try {
      const endpoint = conversation.endpoint;
      if (!endpoint || endpoint.status === "desactive") {
        throw new PermanentDeliveryError("Ce canal n'est plus raccordé.");
      }
      const to = this.box.open(conversation.replyToEnc);
      if (!to) throw new PermanentDeliveryError("Adresse de réponse indisponible.");

      const sender = this.senders.find((s) => s.kinds.includes(endpoint.kind));
      if (!sender) throw new PermanentDeliveryError(`Aucun envoi possible pour le canal ${endpoint.kind}.`);

      const establishment = conversation.assistant.establishment as { name?: string } | null;
      const { ref } = await sender.send({
        endpoint,
        to,
        text: message.text,
        senderName: establishment?.name?.trim() || conversation.assistant.name,
        thread: (conversation.threadMeta as Record<string, string> | null) ?? null,
      });
      await this.prisma.message.update({
        where: { id: messageId },
        data: { delivery: "envoye", providerRef: ref, deliveryError: null },
      });
    } catch (err) {
      if (err instanceof PermanentDeliveryError) {
        this.logger.warn(`Message ${messageId} non remis : ${err.message}`);
        await this.markFailed(messageId, err.message);
        return;
      }
      throw err;
    }
  }

  async markFailed(messageId: string, reason: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { delivery: "echec", deliveryError: reason.slice(0, 500) },
    });
  }
}
