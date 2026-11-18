"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, type HelpReply, type HelpRequestItem } from "@velekya/api-client";
import { helpCopy } from "@velekya/copy";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

async function api() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return (await sessionApi()).help;
}

const msg = (e: unknown) => (e instanceof ApiError ? e.message : helpCopy.error);

export async function askHelp(
  question: string,
  articleId?: string,
): Promise<{ reply?: HelpReply; error?: string }> {
  try {
    const reply = await (await api()).ask({ question, ...(articleId ? { articleId } : {}) });
    revalidatePath("/mon-equipe/aide");
    return { reply };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function sendHelpFeedback(
  id: string,
  helpful: boolean,
): Promise<{ item?: HelpRequestItem; error?: string }> {
  try {
    return { item: await (await api()).feedback(id, helpful) };
  } catch (e) {
    return { error: msg(e) };
  }
}

export async function transmitHelp(id: string): Promise<{ item?: HelpRequestItem; error?: string }> {
  try {
    const item = await (await api()).transmit(id);
    revalidatePath("/mon-equipe/aide");
    return { item };
  } catch (e) {
    return { error: msg(e) };
  }
}
