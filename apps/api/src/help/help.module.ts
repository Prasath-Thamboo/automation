import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { MailModule } from "../mail/mail.module";
import { HelpController } from "./help.controller";
import { HelpService } from "./help.service";
import { AdminHelpController } from "./admin-help.controller";
import { AdminHelpService } from "./admin-help.service";

/**
 * Lot 15 — aide au patron (« Une question ? ») : réponses écrites à l'avance,
 * recherche par mots, transmission à l'équipe Velekya sinon. Back-office sous
 * `/admin/help`.
 */
@Module({
  imports: [AuthModule, QueueModule, MailModule],
  controllers: [HelpController, AdminHelpController],
  providers: [HelpService, AdminHelpService],
})
export class HelpModule {}
