"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addInstruction,
  answerEscalation,
  setSwitch,
  togglePause,
  type FormState,
} from "@/app/mon-equipe/team-actions";
import type { AssistantSwitch, EscalationItem, Instruction } from "@velekya/api-client";
import { switchesCopy as sx } from "@velekya/copy";

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
        className="min-h-touch rounded-full border-2 border-primary-600 px-5 py-2 text-sm font-bold text-primary-700 disabled:opacity-60 bg-white transition-colors hover:bg-primary-50"
      >
        {pending ? "…" : paused ? "Le remettre au travail" : "Le mettre en pause"}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}

/** Lot 14 — ses boutons de pilotage. */
export function SwitchList({ id, switches }: { id: string; switches: AssistantSwitch[] }) {
  if (switches.length === 0) return <p className="mt-3 text-sm text-ink-500">{sx.empty}</p>;
  return (
    <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white shadow-soft">
      {switches.map((s) => (
        <SwitchRow key={s.key} id={id} sw={s} />
      ))}
    </ul>
  );
}

function SwitchRow({ id, sw }: { id: string; sw: AssistantSwitch }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-base text-ink-900">{sw.label}</p>
        {sw.help ? <p className="text-sm text-ink-500">{sw.help}</p> : null}
        {error ? <p className="text-sm text-danger">{sx.error}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={sw.enabled}
        aria-label={sw.label}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setSwitch(id, sw.key, !sw.enabled);
            setError(r.error);
          })
        }
        className={`min-h-touch min-w-[96px] shrink-0 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${ sw.enabled ? "bg-primary-600 text-white" : "border border-ink-300 text-ink-700"
        }`}
      >
        {pending ? "…" : sw.enabled ? sx.on : sx.off}
      </button>
    </li>
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
        className="w-full rounded-md border-2 border-ink-400 px-4 py-3 text-base bg-white focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="inline-flex min-h-touch items-center text-base font-semibold text-primary-700">Consigne ajoutée.</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-touch self-start rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60 shadow-soft transition-colors hover:bg-primary-700"
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
    <div className="rounded-lg border border-ink-100 bg-white p-4 shadow-soft">
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
            className="w-full rounded-md border-2 border-ink-400 px-4 py-3 text-base bg-white focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
          />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="min-h-touch self-start rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60 shadow-soft transition-colors hover:bg-primary-700"
          >
            {saving ? "…" : "Répondre"}
          </button>
        </form>
      )}
    </div>
  );
}
