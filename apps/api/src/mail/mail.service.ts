import { Inject, Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
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

  async send(mail: OutgoingMail): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...mail });
    this.logger.log(`Email « ${mail.subject} » envoyé à ${redact(mail.to)}`);
  }
}

/** N'écrit jamais un email complet dans les logs (§9.4). */
function redact(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local ?? "").slice(0, 2)}***@${domain}`;
}
