/** Régénère `flows/*.workflow.json` (à committer). */
import { writeFileSync } from "node:fs";
import { FLOWS, buildWorkflow, serialize, workflowPath } from "./build";

for (const flow of FLOWS) {
  const path = workflowPath(flow);
  writeFileSync(path, serialize(buildWorkflow(flow)), "utf8");
  console.warn(`Flux « ${flow.slug} » écrit : ${path}`);
}
