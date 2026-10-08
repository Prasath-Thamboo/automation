import { Injectable } from "@nestjs/common";
import { MailService } from "../../mail/mail.service";
import { type ChannelSender, type OutboundMessage, PermanentDeliveryError } from "../channel-sender";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Réponses par email (Lot 12) — canal `email` (depuis l'adresse de réception de
 * l'assistant, dans le fil d'origine) et suites du `formulaire` quand le client
 * a laissé son email. Toujours par SMTP (mailpit en dev, relais Brevo en prod).
 */
@Injectable()
export class EmailChannelSender implements ChannelSender {
  readonly kinds = ["email", "formulaire"] as const;

  constructor(private readonly mail: MailService) {}

  async send(msg: OutboundMessage): Promise<{ ref: string | null }> {
    if (!EMAIL_RE.test(msg.to)) throw new PermanentDeliveryError("Adresse email invalide.");

    const fromAddress = msg.endpoint.kind === "email" ? msg.endpoint.address : this.mail.defaultAddress;
    const subject = msg.thread?.subject
      ? `Re: ${msg.thread.subject.replace(/^(re|tr|fwd?)\s*:\s*/i, "")}`
      : `Votre message à ${msg.senderName}`;
    const headers: Record<string, string> = {};
    if (msg.thread?.messageId) {
      headers["In-Reply-To"] = msg.thread.messageId;
      headers.References = msg.thread.messageId;
    }

    const ref = await this.mail.send({
      from: `${quoteName(msg.senderName)} <${fromAddress}>`,
      replyTo: fromAddress,
      to: msg.to,
      subject,
      text: `${msg.text}\n\n— ${msg.senderName}`,
      html: `<p>${escapeHtml(msg.text).replace(/\n/g, "<br>")}</p><p>— ${escapeHtml(msg.senderName)}</p>`,
      headers,
    });
    return { ref };
  }
}

function quoteName(name: string): string {
  return `"${name.replace(/["\\r\n]/g, "")}"`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
