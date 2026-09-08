"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { createProfessionSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { formToTemplateContent } from "./content-format";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

async function adminApi() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  return (await sessionApi()).admin.catalog;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "L'opération a échoué. Réessayez.";
}

export async function createProfession(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = createProfessionSchema.safeParse({
    slug: form.get("slug"),
    name: form.get("name"),
    sector: form.get("sector"),
    benefit: form.get("benefit"),
    needs: String(form.get("needs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    monthlyPriceEur: Number(form.get("monthlyPriceEur") ?? 89),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  let id: string;
  try {
    const created = await (await adminApi()).create(parsed.data);
    id = created.id;
  } catch (error) {
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/metiers");
  redirect(`/admin/metiers/${id}`);
}

export async function updateProfession(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await (await adminApi()).update(id, {
      name: String(form.get("name") ?? "").trim(),
      sector: String(form.get("sector") ?? "").trim(),
      benefit: String(form.get("benefit") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      monthlyPriceEur: Number(form.get("monthlyPriceEur") ?? 89),
      setupPriceEur: Number(form.get("setupPriceEur") ?? 0),
      trialDays: Number(form.get("trialDays") ?? 14),
      needs: String(form.get("needs") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  } catch (error) {
    return { error: messageOf(error) };
  }
  revalidatePath(`/admin/metiers/${id}`);
  return { ok: true };
}

export async function saveDraft(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await (await adminApi()).saveDraft(id, formToTemplateContent(form));
  } catch (error) {
    return { error: messageOf(error) };
  }
  revalidatePath(`/admin/metiers/${id}`);
  return { ok: true };
}

export async function publishProfession(id: string): Promise<ActionState> {
  try {
    await (await adminApi()).publish(id);
  } catch (error) {
    return { error: messageOf(error) };
  }
  // La fiche publique est en `dynamicParams` : elle se régénère à la demande.
  revalidatePath(`/admin/metiers/${id}`);
  revalidatePath("/employes-virtuels", "layout");
  return { ok: true };
}

export async function setVisibility(id: string, published: boolean): Promise<ActionState> {
  try {
    await (await adminApi()).update(id, { published });
  } catch (error) {
    return { error: messageOf(error) };
  }
  revalidatePath("/admin/metiers");
  revalidatePath("/employes-virtuels");
  return { ok: true };
}

export async function removeProfession(id: string): Promise<void> {
  try {
    await (await adminApi()).remove(id);
  } catch {
    // Best effort ; la liste sera rafraîchie.
  }
  revalidatePath("/admin/metiers");
  revalidatePath("/employes-virtuels");
  redirect("/admin/metiers");
}
