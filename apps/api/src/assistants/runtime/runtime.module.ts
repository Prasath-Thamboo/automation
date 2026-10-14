import { Global, Module } from "@nestjs/common";
import { ENV } from "../../config/config.module";
import type { Env } from "../../config/env";
import { ASSISTANT_RUNTIME } from "./assistant-runtime";
import { RuleBasedRuntime } from "./rule-based.runtime";
import { FakeRuntime } from "./fake.runtime";
import { N8nRuntime } from "./n8n.runtime";

/** Fournit l'implémentation de `AssistantRuntime` selon `ASSISTANT_RUNTIME`. */
@Global()
@Module({
  providers: [
    RuleBasedRuntime,
    FakeRuntime,
    N8nRuntime,
    {
      provide: ASSISTANT_RUNTIME,
      inject: [ENV, RuleBasedRuntime, FakeRuntime, N8nRuntime],
      useFactory: (env: Env, rules: RuleBasedRuntime, fake: FakeRuntime, n8n: N8nRuntime) =>
        env.ASSISTANT_RUNTIME === "fake" ? fake : env.ASSISTANT_RUNTIME === "n8n" ? n8n : rules,
    },
  ],
  exports: [ASSISTANT_RUNTIME],
})
export class RuntimeModule {}
