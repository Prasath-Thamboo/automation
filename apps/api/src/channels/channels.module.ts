import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { AssistantsModule } from "../assistants/assistants.module";
import { CHANNEL_SENDERS, type ChannelSender } from "./channel-sender";
import { ChannelsService } from "./channels.service";
import { ChannelDeliveryService } from "./channel-delivery.service";
import { ChannelDeliveryWorker } from "./channel-delivery.worker";
import { EmailChannelSender } from "./senders/email.sender";
import { FormController } from "./form.controller";
import { MyChannelsController } from "./my-channels.controller";
import { EmailInboundController } from "./email-inbound.controller";
import { TwilioController } from "./twilio.controller";
import { TwilioSmsSender } from "./senders/twilio-sms.sender";
import { MetaController } from "./meta.controller";
import { MetaSender } from "./senders/meta.sender";
import { AdminChannelsController } from "./admin-channels.controller";
import { AdminChannelsService } from "./admin-channels.service";

/**
 * Lot 12 — Canaux de réception. Arrivée des demandes par canal réel, remise des
 * réponses (file `channel-out`), points d'arrivée par assistant.
 */
@Module({
  imports: [AuthModule, MailModule, AssistantsModule],
  controllers: [
    FormController,
    MyChannelsController,
    EmailInboundController,
    TwilioController,
    MetaController,
    AdminChannelsController,
  ],
  providers: [
    ChannelsService,
    AdminChannelsService,
    ChannelDeliveryService,
    ChannelDeliveryWorker,
    EmailChannelSender,
    TwilioSmsSender,
    MetaSender,
    {
      provide: CHANNEL_SENDERS,
      inject: [EmailChannelSender, TwilioSmsSender, MetaSender],
      useFactory: (...senders: ChannelSender[]) => senders,
    },
  ],
  exports: [ChannelsService],
})
export class ChannelsModule {}
