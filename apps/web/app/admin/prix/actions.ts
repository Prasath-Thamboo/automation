"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { createPricingRuleSchema, updatePricingRuleSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface PricingActionState {
  ok?: string;
  error?: string;
}

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
}

const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export async function createRule(
  _prev: PricingActionState,
  form: FormData,
): Promise<PricingActionState> {
  await guard();
  const parsed = createPricingRuleSchema.safeParse({
    kind: form.get("kind"),
    key: String(form.get("key") ?? "").trim(),
    label: String(form.get("label") ?? "").trim(),
    setupEur: num(form.get("setupEur")),
    monthlyEur: num(form.get("monthlyEur")),
    factor: num(form.get("factor"), 1),
    active: true,
    position: num(form.get("position")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    await (await sessionApi()).admin.pricing.create(parsed.data);
    revalidatePath("/admin/prix");
    return { ok: `Règle « ${parsed.data.label} » ajoutée.` };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}

export async function updateRule(
  id: string,
  _prev: PricingActionState,
  form: FormData,
): Promise<PricingActionState> {
  await guard();
  const parsed = updatePricingRuleSchema.safeParse({
    label: String(form.get("label") ?? "").trim(),
    setupEur: num(form.get("setupEur")),
    monthlyEur: num(form.get("monthlyEur")),
    factor: num(form.get("factor"), 1),
    active: form.get("active") === "on",
    position: num(form.get("position")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    await (await sessionApi()).admin.pricing.update(id, parsed.data);
    revalidatePath("/admin/prix");
    return { ok: "Règle enregistrée." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}

export async function deleteRule(id: string): Promise<void> {
  await guard();
  try {
    await (await sessionApi()).admin.pricing.remove(id);
  } catch {
    // best effort — la liste se rafraîchit
  }
  revalidatePath("/admin/prix");
}
