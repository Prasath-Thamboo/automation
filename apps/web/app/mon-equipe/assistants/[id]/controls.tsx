"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addInstruction,
  answerEscalation,
  togglePause,
  type FormState,
} from "@/app/mon-equipe/team-actions";
import type { EscalationItem, Instruction } from "@tando/api-client";

export function PauseControl({ id, paused }: { id: string; paused: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await togglePause(id, !paused);
            setError(r.error);
          })
        }
        className="min-h-touch rounded-md border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-60"
      >
        {pending ? "…" : paused ? "Le remettre au travail" : "Le mettre en pause"}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}

export function InstructionForm({ id }: { id: string }) {
  const [state, action, saving] = useActionState<FormState, FormData>(
    addInstruction.bind(null, id),
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea
        name="text"
        rows={2}
        placeholder="Ex. : quand on demande le parking, dis qu'il y en a un derrière le bâtiment."
        className="w-full rounded-md border border-ink-100 px-3 py-2 text-base"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-primary-700">Consigne ajoutée.</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-touch self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "…" : "Ajouter la consigne"}
      </button>
    </form>
  );
}

export function InstructionList({ instructions }: { instructions: Instruction[] }) {
  if (instructions.length === 0) {
    return <p className="text-sm text-ink-500">Aucune consigne pour l&apos;instant.</p>;
  }
  return (
    <ul className="space-y-2">
      {instructions.map((i) => (
        <li key={i.version} className="rounded-md bg-ink-100/60 px-3 py-2 text-sm text-ink-700">
          <span className="mr-2 font-semibold text-ink-500">v{i.version}</span>
          {i.text}
        </li>
      ))}
    </ul>
  );
}

export function EscalationCard({ escalation, assistantId }: { escalation: EscalationItem; assistantId: string }) {
  const [state, action, saving] = useActionState<FormState, FormData>(
    answerEscalation.bind(null, escalation.id, assistantId),
    {},
  );
  const done = escalation.status === "repondue" || state.ok;

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <p className="text-base font-semibold text-ink-900">{escalation.question}</p>
      {escalation.context ? (
        <p className="mt-1 text-sm text-ink-500">{escalation.context}</p>
      ) : null}

      {done ? (
        <p className="mt-3 rounded-md bg-primary-50 px-3 py-2 text-sm text-ink-700">
          Votre réponse : {escalation.answer ?? "envoyée"}
        </p>
      ) : (
        <form action={action} className="mt-3 flex flex-col gap-2">
          <textarea
            name="answer"
            rows={2}
            placeholder="Votre réponse — il reprendra la main avec."
            className="w-full rounded-md border border-ink-100 px-3 py-2 text-base"
          />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="min-h-touch self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "…" : "Répondre"}
          </button>
        </form>
      )}
    </div>
  );
}
