"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { createAdminChannelSchema, updateAdminChannelSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface ChannelActionState {
  ok?: string;
  error?: string;
}

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
}

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function fail(error: unknown): ChannelActionState {
  return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
}

export async function createChannel(
  path: string,
  assistantId: string,
  _prev: ChannelActionState,
  form: FormData,
): Promise<ChannelActionState> {
  await guard();
  const parsed = createAdminChannelSchema.safeParse({
    kind: form.get("kind"),
    address: text(form.get("address")),
    status: form.get("status") || "actif",
    display: text(form.get("display")),
    forwardTo: text(form.get("forwardTo")),
    accessToken: text(form.get("accessToken")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  try {
    await (await sessionApi()).admin.channels.create(assistantId, parsed.data);
    revalidatePath(path);
    return { ok: "Canal raccordé." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateChannel(
  path: string,
  id: string,
  _prev: ChannelActionState,
  form: FormData,
): Promise<ChannelActionState> {
  await guard();
  const parsed = updateAdminChannelSchema.safeParse({
    status: form.get("status") || undefined,
    display: text(form.get("display")),
    forwardTo: text(form.get("forwardTo")),
    accessToken: text(form.get("accessToken")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  try {
    await (await sessionApi()).admin.channels.update(id, parsed.data);
    revalidatePath(path);
    return { ok: "Enregistré." };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteChannel(path: string, id: string): Promise<ChannelActionState> {
  await guard();
  try {
    await (await sessionApi()).admin.channels.remove(id);
    revalidatePath(path);
    return { ok: "Canal supprimé." };
  } catch (error) {
    return fail(error);
  }
}
