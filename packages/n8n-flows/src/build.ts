/**
 * Fabrique le flux n8n importable d'un métier : Webhook (en-tête X-Tando-Token)
 * → Code (logique du métier, compilée depuis ce paquet) → Respond to Webhook.
 *
 * Le nœud Code ne peut rien importer : on y recopie `common.ts` puis le fichier
 * du métier, compilés en JavaScript, sans leurs `import` / `export`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));

export interface FlowDefinition {
  slug: string;
  /** Nom affiché dans n8n (back-office : vocabulaire technique autorisé). */
  name: string;
  /** Fichier de logique dans `src/`, qui exporte `handle(req, now)`. */
  source: string;
  /** Identifiants stables : n8n les garde à l'import (mise à jour sans doublon). */
  ids: { workflow: string; webhook: string };
}

export const FLOWS: FlowDefinition[] = [
  {
    slug: "dentiste",
    name: "Tando — Cabinet dentaire (générique)",
    source: "dentiste.ts",
    ids: { workflow: "tandoDentiste01", webhook: "6f1d2c3e-7a43-4c1b-9f0e-5d2a8b7c1e01" },
  },
];

/** Nom de la clé d'en-tête attendue, partagé avec l'API (`n8n.runtime.ts`). */
export const HEADER_AUTH_CREDENTIAL = "Tando — X-Tando-Token";

function toPlainJs(file: string): string {
  const source = readFileSync(join(here, file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false },
  });
  return outputText
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "")
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, "")
    .replace(/^export\s+(?=(async\s+)?(function|const|let|class)\b)/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Code complet du nœud Code (mode « Run Once for All Items »). */
export function buildCode(flow: FlowDefinition): string {
  return [
    `// Flux « ${flow.slug} » — généré par @tando/n8n-flows (pnpm -F @tando/n8n-flows build:flows).`,
    "// Ne pas modifier ici : modifier packages/n8n-flows/src puis régénérer.",
    "",
    toPlainJs("common.ts"),
    "",
    toPlainJs(flow.source),
    "",
    "const incoming = $input.first().json;",
    "return [{ json: handle(incoming.body ?? incoming, new Date()) }];",
    "",
  ].join("\n");
}

export function buildWorkflow(flow: FlowDefinition): Record<string, unknown> {
  return {
    id: flow.ids.workflow,
    name: flow.name,
    active: false,
    settings: { executionOrder: "v1", saveDataSuccessExecution: "none" },
    meta: { templateCredsSetupCompleted: false },
    nodes: [
      {
        id: "b4c0f6d2-1a11-4e0a-8c11-000000000001",
        name: "Message reçu",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [0, 0],
        webhookId: flow.ids.webhook,
        parameters: {
          httpMethod: "POST",
          path: `tando-${flow.slug}`,
          authentication: "headerAuth",
          responseMode: "responseNode",
          options: {},
        },
        credentials: { httpHeaderAuth: { name: HEADER_AUTH_CREDENTIAL } },
      },
      {
        id: "b4c0f6d2-1a11-4e0a-8c11-000000000002",
        name: `Logique ${flow.slug}`,
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [260, 0],
        parameters: { mode: "runOnceForAllItems", language: "javaScript", jsCode: buildCode(flow) },
      },
      {
        id: "b4c0f6d2-1a11-4e0a-8c11-000000000003",
        name: "Réponse",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position: [520, 0],
        parameters: { respondWith: "firstIncomingItem", options: {} },
      },
    ],
    connections: {
      "Message reçu": { main: [[{ node: `Logique ${flow.slug}`, type: "main", index: 0 }]] },
      [`Logique ${flow.slug}`]: { main: [[{ node: "Réponse", type: "main", index: 0 }]] },
    },
    pinData: {},
  };
}

export function workflowPath(flow: FlowDefinition): string {
  return join(here, "..", "flows", `${flow.slug}.workflow.json`);
}

export function serialize(workflow: Record<string, unknown>): string {
  return `${JSON.stringify(workflow, null, 2)}\n`;
}
