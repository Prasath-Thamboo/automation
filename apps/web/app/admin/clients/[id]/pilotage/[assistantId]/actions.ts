"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { findJargon } from "@tando/copy";
import { createSwitchSchema, updateSwitchSchema, updateWorkflowSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface SetupActionState {
  ok?: string;
  error?: string;
}

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
}

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function fail(error: unknown): SetupActionState {
  return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
}

/** Libellés vus par le client : même règle anti-jargon que `@tando/copy` (§2). */
function jargonError(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    const hit = t ? findJargon(t)[0] : undefined;
    if (hit) return `« ${hit.term} » est interdit dans un libellé client (§2).`;
  }
  return null;
}

export async function saveWorkflow(
  path: string,
  assistantId: string,
  _prev: SetupActionState,
  form: FormData,
): Promise<SetupActionState> {
  await guard();
  const raw = text(form.get("workflowUrl"));
  const parsed = updateWorkflowSchema.safeParse({ workflowUrl: raw || null });
  if (!parsed.success) return { error: "Adresse invalide (URL complète du webhook attendue)." };
  try {
    await (await sessionApi()).admin.setup.setWorkflow(assistantId, parsed.data);
    revalidatePath(path);
    return { ok: parsed.data.workflowUrl ? "Flux branché." : "Flux débranché." };
  } catch (error) {
    return fail(error);
  }
}

export async function createSwitch(
  path: string,
  assistantId: string,
  _prev: SetupActionState,
  form: FormData,
): Promise<SetupActionState> {
  await guard();
  const parsed = createSwitchSchema.safeParse({
    key: text(form.get("key")),
    label: text(form.get("label")),
    help: text(form.get("help")) || null,
    enabled: form.get("enabled") === "on",
    position: Number(form.get("position") || 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const jargon = jargonError(parsed.data.label, parsed.data.help);
  if (jargon) return { error: jargon };
  try {
    await (await sessionApi()).admin.setup.createSwitch(assistantId, parsed.data);
    revalidatePath(path);
    return { ok: "Bouton ajouté." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateSwitch(
  path: string,
  id: string,
  _prev: SetupActionState,
  form: FormData,
): Promise<SetupActionState> {
  await guard();
  const parsed = updateSwitchSchema.safeParse({
    label: text(form.get("label")),
    help: text(form.get("help")) || null,
    position: Number(form.get("position") || 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const jargon = jargonError(parsed.data.label, parsed.data.help);
  if (jargon) return { error: jargon };
  try {
    await (await sessionApi()).admin.setup.updateSwitch(id, parsed.data);
    revalidatePath(path);
    return { ok: "Enregistré." };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSwitch(path: string, id: string): Promise<SetupActionState> {
  await guard();
  try {
    await (await sessionApi()).admin.setup.removeSwitch(id);
    revalidatePath(path);
    return { ok: "Bouton supprimé." };
  } catch (error) {
    return fail(error);
  }
}
