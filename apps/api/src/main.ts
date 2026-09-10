import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { bootstrapEnv } from "./config/config.module";
import { shouldServeApiDocs } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = bootstrapEnv();
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    // Corps brut conservé pour la vérification de signature des webhooks de paiement.
    rawBody: true,
  });

  app.setGlobalPrefix("api/v1");
  // L'API ne sert que du JSON et ne doit jamais être encadrée.
  app.use(helmet({ frameguard: { action: "deny" } }));
  app.use(cookieParser());
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  if (shouldServeApiDocs(env)) {
    const openapi = new DocumentBuilder()
      .setTitle("Tando API")
      .setDescription("Contrat unique consommé par le web, le mobile et le back-office.")
      .setVersion("v1")
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, openapi));
    logger.log("Doc OpenAPI exposée sur /api/docs");
  }

  await app.listen(env.API_PORT);
  logger.log(`API prête sur ${env.API_URL}`);
}

void bootstrap();
