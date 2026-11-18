"use client";

import { useActionState } from "react";
import type { AdminHelpArticle, HelpAction } from "@velekya/api-client";
import {
  answerRequest,
  createArticle,
  deleteArticle,
  updateArticle,
  type HelpActionState,
} from "./actions";

const input = "w-full rounded-md border border-ink-100 px-2 py-1 text-sm";
const button =
  "rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50";

// Liste locale : `@velekya/types` (CommonJS) ne se charge pas dans un composant
// client sous `next dev` (voir notes du Lot 12).
const ACTION_LABEL: Record<HelpAction, string> = {
  aucune: "Aucun renvoi",
  equipe: "Mon équipe",
  documents: "Mes documents",
  compte: "Mon compte",
  reglages: "Notifications (mobile)",
  carnet: "Carnet de bord",
};

function Feedback({ state }: { state: HelpActionState }) {
  if (state.error) return <p role="alert" className="text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-primary-700">{state.ok}</p>;
  return null;
}

function ArticleFields({ article }: { article?: AdminHelpArticle }) {
  return (
    <>
      <label className="block text-xs text-ink-500">
        Question (vue par le client)
        <input name="question" defaultValue={article?.question} className={`mt-0.5 ${input}`} required />
      </label>
      <label className="block text-xs text-ink-500">
        Mots-clés (séparés par des virgules ; expressions de plusieurs mots = bonus)
        <input
          name="keywords"
          defaultValue={article?.keywords.join(", ")}
          className={`mt-0.5 ${input}`}
        />
      </label>
      <label className="block text-xs text-ink-500">
        Réponse (vue par le client — vocabulaire §2)
        <textarea
          name="answer"
          defaultValue={article?.answer}
          rows={3}
          className={`mt-0.5 ${input}`}
          required
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink-500">
          Renvoi
          <select name="action" defaultValue={article?.action ?? "aucune"} className={`mt-0.5 block ${input}`}>
            {(Object.keys(ACTION_LABEL) as HelpAction[]).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-500">
          Ordre
          <input
            name="position"
            type="number"
            defaultValue={article?.position ?? 0}
            className="mt-0.5 block w-20 rounded-md border border-ink-100 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink-600">
          <input type="checkbox" name="published" defaultChecked={article?.published ?? true} /> Publiée
        </label>
      </div>
    </>
  );
}

export function NewArticleForm() {
  const [state, action, pending] = useActionState<HelpActionState, FormData>(createArticle, {});
  return (
    <details className="rounded-lg border border-dashed border-ink-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-primary-700">
        + Nouvelle réponse
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <label className="block text-xs text-ink-500">
          Identifiant (slug)
          <input name="slug" placeholder="changer-de-carte" className={`mt-0.5 ${input}`} required />
        </label>
        <ArticleFields />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={button}>
            Ajouter
          </button>
          <Feedback state={state} />
        </div>
      </form>
    </details>
  );
}

export function ArticleRow({ article }: { article: AdminHelpArticle }) {
  const [state, action, pending] = useActionState<HelpActionState, FormData>(
    updateArticle.bind(null, article.id),
    {},
  );
  return (
    <li className="rounded-lg border border-ink-100 bg-white p-4">
      <details>
        <summary className="cursor-pointer text-sm">
          <span className="font-semibold text-ink-900">{article.question}</span>
          <span className="text-ink-500">
            {" "}
            · {article.slug} · servie {article.servedCount}×
            {article.unhelpfulCount > 0 ? ` · ${article.unhelpfulCount}× jugée inutile` : ""}
            {article.published ? "" : " · masquée"}
          </span>
        </summary>
        <form action={action} className="mt-3 space-y-2">
          <ArticleFields article={article} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className={button}>
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => void deleteArticle(article.id)}
              className="text-sm text-danger"
            >
              Supprimer
            </button>
            <Feedback state={state} />
          </div>
        </form>
      </details>
    </li>
  );
}

export function AnswerForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<HelpActionState, FormData>(
    answerRequest.bind(null, id),
    {},
  );
  return (
    <form action={action} className="mt-3 space-y-2">
      <textarea
        name="answer"
        rows={3}
        placeholder="Votre réponse (envoyée par email et visible dans son espace)"
        className={input}
        required
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={button}>
          Répondre
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
