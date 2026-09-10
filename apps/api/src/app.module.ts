import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppConfigModule, ENV } from "./config/config.module";
import type { Env } from "./config/env";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuditModule } from "./audit/audit.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { QuotesModule } from "./quotes/quotes.module";
import { BillingModule } from "./billing/billing.module";
import { AssistantsModule } from "./assistants/assistants.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { TeamModule } from "./team/team.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: env.RATE_LIMIT_TTL_SECONDS * 1000, limit: env.RATE_LIMIT_MAX }],
        // Coupe-circuit dev/CI (interdit en production, cf. env.ts).
        skipIf: () => env.RATE_LIMIT_DISABLED,
      }),
    }),
    HealthModule,
    AuthModule,
    CatalogModule,
    QuotesModule,
    BillingModule,
    AssistantsModule,
    NotificationsModule,
    TeamModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
