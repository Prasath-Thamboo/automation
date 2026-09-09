import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RuntimeModule } from "./runtime/runtime.module";
import { RuntimeService } from "./runtime.service";
import { InboundController } from "./inbound.controller";

@Module({
  imports: [QueueModule, RuntimeModule],
  controllers: [InboundController],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class AssistantsModule {}
