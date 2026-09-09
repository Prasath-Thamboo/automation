import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { BillingModule } from "../billing/billing.module";
import { AssistantsModule } from "../assistants/assistants.module";
import { AssistantService } from "./assistant.service";
import { EscalationsService } from "./escalations.service";
import { CatalogSubscribeService } from "./catalog-subscribe.service";
import { AccountService } from "./account.service";
import { TeamController } from "./team.controller";

@Module({
  imports: [AuthModule, QueueModule, BillingModule, AssistantsModule],
  controllers: [TeamController],
  providers: [AssistantService, EscalationsService, CatalogSubscribeService, AccountService],
})
export class TeamModule {}
