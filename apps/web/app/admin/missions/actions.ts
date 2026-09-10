"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { updateMissionSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface MissionActionState {
  ok?: string;
  error?: string;
}

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
}

export async function setMissionStatus(id: string, status: string): Promise<MissionActionState> {
  await guard();
  const parsed = updateMissionSchema.safeParse({ status });
  if (!parsed.success) return { error: "Statut invalide." };
  try {
    await (await sessionApi()).admin.missions.update(id, parsed.data);
    revalidatePath(`/admin/missions/${id}`);
    revalidatePath("/admin/missions");
    return { ok: "Statut mis à jour." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}

export async function saveChecklist(
  id: string,
  _prev: MissionActionState,
  form: FormData,
): Promise<MissionActionState> {
  await guard();
  const labels = form.getAll("label").map((v) => String(v).trim());
  const doneSet = new Set(form.getAll("done").map((v) => String(v)));
  const checklist = labels
    .map((label, i) => ({ label, done: doneSet.has(String(i)) }))
    .filter((item) => item.label.length > 0);

  const newLabel = String(form.get("newLabel") ?? "").trim();
  if (newLabel) checklist.push({ label: newLabel, done: false });

  const parsed = updateMissionSchema.safeParse({ checklist });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Liste invalide." };
  }
  try {
    await (await sessionApi()).admin.missions.update(id, parsed.data);
    revalidatePath(`/admin/missions/${id}`);
    return { ok: "Check-list enregistrée." };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}
