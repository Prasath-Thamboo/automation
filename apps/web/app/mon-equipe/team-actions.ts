"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";

export interface FormState {
  ok?: boolean;
  error?: string;
}

async function api() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return (await sessionApi()).me;
}

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "L'opération a échoué. Réessayez.");

export async function subscribeToProfession(slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(`/employes-virtuels/${slug}/souscrire`)}`);
  let assistantId: string;
  try {
    ({ assistantId } = await (await sessionApi()).me.subscribeCatalog(slug));
  } catch {
    redirect("/mon-equipe");
  }
  revalidatePath("/mon-equipe");
  redirect(`/mon-equipe/assistants/${assistantId}/premier-jour`);
}

export async function saveOnboardingStep(
  assistantId: string,
  step: number,
  data: {
    establishment?: Partial<{ name: string; address: string; openingHours: string }>;
    specifics?: Record<string, string>;
    contactPrefs?: Partial<{ email: string; phone: string; inbox: string }>;
  },
): Promise<FormState> {
  try {
    await (await api()).onboarding(assistantId, { step, ...data });
  } catch (e) {
    return { error: msg(e) };
  }
  return { ok: true };
}

export async function activateAssistant(assistantId: string): Promise<FormState> {
  try {
    await (await api()).activateAssistant(assistantId);
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/mon-equipe/assistants/${assistantId}`);
  redirect(`/mon-equipe/assistants/${assistantId}`);
}

export interface ChatTurn {
  kind: "reply" | "escalate" | "appointment";
  reply: string;
  sessionId: string;
  escalated: boolean;
  error?: string;
}

export async function simulateMessage(
  assistantId: string,
  text: string,
  sessionId: string | undefined,
): Promise<ChatTurn> {
  try {
    const t = await (await api()).simulate(assistantId, text, sessionId);
    return {
      kind: t.kind,
      reply: t.reply,
      sessionId: t.sessionId,
      escalated: t.escalated,
    };
  } catch (e) {
    return {
      kind: "reply",
      reply: "",
      sessionId: sessionId ?? "",
      escalated: false,
      error: msg(e),
    };
  }
}

export async function addInstruction(
  assistantId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const text = String(form.get("text") ?? "").trim();
  if (text.length < 3) return { error: "Écrivez une consigne un peu plus complète." };
  try {
    await (await api()).addInstruction(assistantId, { text });
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/mon-equipe/assistants/${assistantId}`);
  return { ok: true };
}

export async function answerEscalation(
  escalationId: string,
  assistantId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const answer = String(form.get("answer") ?? "").trim();
  if (!answer) return { error: "Écrivez votre réponse." };
  try {
    await (await api()).answerEscalation(escalationId, { answer });
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/mon-equipe/assistants/${assistantId}`);
  return { ok: true };
}

export async function togglePause(assistantId: string, pause: boolean): Promise<FormState> {
  try {
    const client = await api();
    if (pause) await client.pauseAssistant(assistantId);
    else await client.resumeAssistant(assistantId);
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/mon-equipe/assistants/${assistantId}`);
  revalidatePath("/mon-equipe");
  return { ok: true };
}

export async function renameAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const fullName = String(form.get("fullName") ?? "").trim();
  if (fullName.length < 1) return { error: "Indiquez votre nom." };
  try {
    await (await api()).updateAccount({ fullName });
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath("/mon-equipe/compte");
  return { ok: true };
}

export async function cancelSubscription(): Promise<FormState> {
  try {
    await (await api()).cancelSubscription();
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath("/mon-equipe/compte");
  revalidatePath("/mon-equipe");
  return { ok: true };
}

export async function deleteAccount(): Promise<void> {
  try {
    await (await api()).deleteAccount();
  } catch {
    // même en cas d'erreur partielle, on déconnecte le navigateur
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?compte=supprime");
}
