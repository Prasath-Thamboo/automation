import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Global, Module } from "@nestjs/common";
import { loadEnv, type Env } from "./env";

export const ENV = Symbol("ENV");

/**
 * Charge le `.env` de la racine du monorepo (source unique), puis un éventuel
 * `.env` local à `apps/api` qui le surcharge. Doit être appelé avant la création
 * de l'app Nest — `main.ts` s'en charge.
 */
export function bootstrapEnv(): Env {
  for (const path of [resolve(process.cwd(), "../../.env"), resolve(process.cwd(), ".env")]) {
    if (existsSync(path)) process.loadEnvFile(path);
  }
  return loadEnv();
}

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => loadEnv() }],
  exports: [ENV],
})
export class AppConfigModule {}
