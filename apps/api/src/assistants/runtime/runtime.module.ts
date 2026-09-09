import { Global, Module } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { ASSISTANT_RUNTIME } from "./assistant-runtime";
import { RuleBasedRuntime } from "./rule-based.runtime";
import { FakeRuntime } from "./fake.runtime";

/** Fournit l'implémentation de `AssistantRuntime` selon `ASSISTANT_RUNTIME`. */
@Global()
@Module({
  providers: [
    RuleBasedRuntime,
    FakeRuntime,
    {
      provide: ASSISTANT_RUNTIME,
      inject: [ENV, RuleBasedRuntime, FakeRuntime],
      useFactory: (env: Env, rules: RuleBasedRuntime, fake: FakeRuntime) =>
        env.ASSISTANT_RUNTIME === "fake" ? fake : rules,
    },
  ],
  exports: [ASSISTANT_RUNTIME],
})
export class RuntimeModule {}
