import { Inject, Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Expéditeur (défaut : MAIL_FROM). Lot 12 : adresse de réception de l'assistant. */
  from?: string;
  replyTo?: string;
  /** En-têtes de fil (`In-Reply-To`, `References`). */
  headers?: Record<string, string>;
}

/**
 * Envoi d'emails transactionnels. En dev : SMTP vers mailpit (http://localhost:8025).
 * En prod : un service type Resend via le même SMTP ou son transport dédié.
 * Les envois passent par la file `mail` (voir queue/) — ce service fait l'envoi effectif.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger("Mail");
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(ENV) env: Env) {
    this.from = env.MAIL_FROM;
    this.transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
    });
  }

  /** Envoie et renvoie l'identifiant `Message-ID` attribué. */
  async send(mail: OutgoingMail): Promise<string | null> {
    const info = (await this.transporter.sendMail({ ...mail, from: mail.from ?? this.from })) as {
      messageId?: string;
    };
    this.logger.log(`Email « ${mail.subject} » envoyé à ${redact(mail.to)}`);
    return info.messageId ?? null;
  }

  /** Adresse nue de l'expéditeur par défaut (`bonjour@…` dans `Tando <bonjour@…>`). */
  get defaultAddress(): string {
    return /<([^>]+)>/.exec(this.from)?.[1] ?? this.from;
  }
}

/** N'écrit jamais un email complet dans les logs (§9.4). */
function redact(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local ?? "").slice(0, 2)}***@${domain}`;
}
