"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { findJargon } from "@velekya/copy";
import { updateProfessionWorkflowSchema } from "@velekya/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface WorkflowActionState {
  ok?: string;
  error?: string;
}

/**
 * Une ligne par bouton : `clé | libellé | aide | on`. Aide et « on » facultatifs
 * (« on » = activé par défaut pour les nouveaux employés).
 */
function parseSwitchLines(raw: string) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [key = "", label = "", help = "", flag = ""] = line.split("|").map((p) => p.trim());
      return { key, label, help: help || null, enabled: flag.toLowerCase() === "on" };
    });
}

export async function saveProfessionWorkflow(
  professionId: string,
  _prev: WorkflowActionState,
  form: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const url = String(form.get("workflowUrl") ?? "").trim();
  const parsed = updateProfessionWorkflowSchema.safeParse({
    workflowUrl: url || null,
    defaultSwitches: parseSwitchLines(String(form.get("switches") ?? "")),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue?.path.join(".") || "formulaire"} : ${issue?.message ?? "invalide"}` };
  }
  // Libellés vus par le client : même règle anti-jargon que `@velekya/copy` (§2).
  for (const s of parsed.data.defaultSwitches) {
    const hit = [s.label, s.help].map((t) => (t ? findJargon(t)[0] : undefined)).find(Boolean);
    if (hit) return { error: `« ${hit.term} » est interdit dans un libellé client (§2).` };
  }
  try {
    await (await sessionApi()).admin.setup.setProfessionWorkflow(professionId, parsed.data);
    revalidatePath(`/admin/metiers/${professionId}`);
    return { ok: parsed.data.workflowUrl ? "Flux générique branché." : "Enregistré (pas de flux : moteur à règles)." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}
