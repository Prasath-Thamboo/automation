import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RuntimeModule } from "./runtime/runtime.module";
import { RuntimeService } from "./runtime.service";
import { N8nController, N8nProfessionsController } from "./n8n.controller";
import { SecretBox } from "../channels/secret-box";

@Module({
  imports: [QueueModule, RuntimeModule],
  controllers: [N8nController, N8nProfessionsController],
  providers: [RuntimeService, SecretBox],
  exports: [RuntimeService, SecretBox],
})
export class AssistantsModule {}
