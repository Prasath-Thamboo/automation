import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MagicLinkService } from "./magic-link.service";
import { SessionService } from "./session.service";
import { SessionGuard } from "./session.guard";

@Module({
  imports: [QueueModule],
  controllers: [AuthController],
  providers: [AuthService, MagicLinkService, SessionService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
