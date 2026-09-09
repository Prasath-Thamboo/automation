"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { updateQuoteSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

async function adminApi() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  return (await sessionApi()).admin.quotes;
}

const msg = (e: unknown) =>
  e instanceof ApiError ? e.message : "L'opération a échoué. Réessayez.";

export async function updateQuote(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = updateQuoteSchema.safeParse({
    complexityFactor: Number(form.get("complexityFactor") ?? 1),
    complexityNote: String(form.get("complexityNote") ?? ""),
    engagementMonths: Number(form.get("engagementMonths") ?? 0),
    serviceDelayDays: Number(form.get("serviceDelayDays") ?? 14),
    formula: String(form.get("formula") ?? "sur-mesure"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    await (await adminApi()).update(id, parsed.data);
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/admin/devis/${id}`);
  return { ok: true };
}

export async function sendQuote(id: string): Promise<ActionState> {
  try {
    await (await adminApi()).send(id);
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/admin/devis/${id}`);
  revalidatePath("/admin/devis");
  return { ok: true };
}
