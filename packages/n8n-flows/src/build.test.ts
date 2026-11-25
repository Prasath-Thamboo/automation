import { readFileSync } from "node:fs";
import { FLOWS, buildWorkflow, serialize, workflowPath } from "./build";
import type { FlowReply, FlowRequest } from "./common";

function minimalRequest(professionSlug: string, text: string): FlowRequest {
  return {
    version: 2,
    channel: "sms",
    text,
    assistant: {
      id: "a1",
      name: "Camille",
      role: "votre assistante",
      professionSlug,
      workflowScope: "metier",
      jobDescription: {},
      establishment: { address: "12 rue des Lilas, Lyon", openingHours: "du mardi au samedi" },
      specifics: {},
    },
    instructions: [],
    switches: {},
    history: [],
  };
}

describe.each(FLOWS)("flux n8n généré « $slug »", (flow) => {
  it("est à jour (sinon : pnpm -F @velekya/n8n-flows build:flows)", () => {
    expect(readFileSync(workflowPath(flow), "utf8")).toBe(serialize(buildWorkflow(flow)));
  });

  it("a un chemin de webhook et des identifiants propres", () => {
    const others = FLOWS.filter((f) => f !== flow);
    expect(others.map((f) => f.ids.workflow)).not.toContain(flow.ids.workflow);
    expect(others.map((f) => f.ids.webhook)).not.toContain(flow.ids.webhook);
  });

  it("le code du nœud s'exécute comme dans n8n", () => {
    const wf = buildWorkflow(flow) as { nodes: Array<{ type: string; parameters: { jsCode?: string } }> };
    const code = wf.nodes.find((n) => n.type === "n8n-nodes-base.code")!.parameters.jsCode!;
    const run = (body: unknown) =>
      (new Function("$input", code) as ($input: unknown) => Array<{ json: FlowReply }>)({
        first: () => ({ json: { headers: {}, body } }),
      })[0]!.json;

    expect(run(minimalRequest(flow.slug, "Quelle est votre adresse ?"))).toMatchObject({ kind: "reply" });
    expect(run(minimalRequest(flow.slug, "Une question très particulière sur mon dossier"))).toMatchObject({
      kind: "escalate",
    });
    expect(run({ nope: true }).kind).toBe("escalate");
  });
});
