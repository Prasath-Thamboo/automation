"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { findJargon } from "@velekya/copy";
import {
  answerHelpRequestSchema,
  createHelpArticleSchema,
  updateHelpArticleSchema,
} from "@velekya/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface HelpActionState {
  ok?: string;
  error?: string;
}

const PATH = "/admin/aide";

async function guard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
}

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const keywords = (v: FormDataEntryValue | null) =>
  text(v)
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

function fail(error: unknown): HelpActionState {
  return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
}

/** Textes lus par le client : même règle anti-jargon que `@velekya/copy` (§2). */
function jargonError(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    const hit = t ? findJargon(t)[0] : undefined;
    if (hit) return `« ${hit.term} » est interdit dans un texte client (§2).`;
  }
  return null;
}

function articleFields(form: FormData) {
  return {
    question: text(form.get("question")),
    keywords: keywords(form.get("keywords")),
    answer: text(form.get("answer")),
    action: text(form.get("action")) || "aucune",
    published: form.get("published") === "on",
    position: Number(form.get("position") || 0),
  };
}

export async function createArticle(
  _prev: HelpActionState,
  form: FormData,
): Promise<HelpActionState> {
  await guard();
  const parsed = createHelpArticleSchema.safeParse({
    slug: text(form.get("slug")),
    ...articleFields(form),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const jargon = jargonError(parsed.data.question, parsed.data.answer);
  if (jargon) return { error: jargon };
  try {
    await (await sessionApi()).admin.help.createArticle(parsed.data);
    revalidatePath(PATH);
    return { ok: "Réponse ajoutée." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateArticle(
  id: string,
  _prev: HelpActionState,
  form: FormData,
): Promise<HelpActionState> {
  await guard();
  const parsed = updateHelpArticleSchema.safeParse(articleFields(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const jargon = jargonError(parsed.data.question, parsed.data.answer);
  if (jargon) return { error: jargon };
  try {
    await (await sessionApi()).admin.help.updateArticle(id, parsed.data);
    revalidatePath(PATH);
    return { ok: "Enregistré." };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteArticle(id: string): Promise<void> {
  await guard();
  try {
    await (await sessionApi()).admin.help.removeArticle(id);
  } catch {
    // best effort — la liste se rafraîchit
  }
  revalidatePath(PATH);
}

export async function answerRequest(
  id: string,
  _prev: HelpActionState,
  form: FormData,
): Promise<HelpActionState> {
  await guard();
  const parsed = answerHelpRequestSchema.safeParse({ answer: text(form.get("answer")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Réponse invalide." };
  const jargon = jargonError(parsed.data.answer);
  if (jargon) return { error: jargon };
  try {
    await (await sessionApi()).admin.help.answer(id, parsed.data.answer);
    revalidatePath(PATH);
    return { ok: "Réponse envoyée au client (email + espace)." };
  } catch (error) {
    return fail(error);
  }
}
