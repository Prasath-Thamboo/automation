"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdminSwitch } from "@tando/api-client";
import {
  createSwitch,
  deleteSwitch,
  saveWorkflow,
  updateSwitch,
  type SetupActionState,
} from "./actions";

const input = "rounded-md border border-ink-100 px-2 py-1 text-sm";
const button =
  "rounded-md border border-primary-600 px-3 py-1 text-sm font-semibold text-primary-700 disabled:opacity-60";

function Feedback({ state }: { state: SetupActionState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="inline-flex min-h-touch items-center text-base font-semibold text-primary-700">{state.ok}</p>;
  return null;
}

export function WorkflowForm({
  assistantId,
  path,
  workflowUrl,
}: {
  assistantId: string;
  path: string;
  workflowUrl: string | null;
}) {
  const [state, action, pending] = useActionState<SetupActionState, FormData>(
    saveWorkflow.bind(null, path, assistantId),
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <label className="block text-xs text-ink-500">
        URL du webhook de production (nœud Webhook n8n, méthode POST). Vide = débrancher.
        <input
          name="workflowUrl"
          type="url"
          defaultValue={workflowUrl ?? ""}
          placeholder="https://n8n.tando.fr/webhook/…"
          className={`mt-0.5 block w-full font-mono ${input}`}
        />
      </label>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "…" : "Enregistrer"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function SwitchRow({ sw, path }: { sw: AdminSwitch; path: string }) {
  const [state, action, pending] = useActionState<SetupActionState, FormData>(
    updateSwitch.bind(null, path, sw.id),
    {},
  );
  const [removing, startRemove] = useTransition();
  const [removeState, setRemoveState] = useState<SetupActionState>({});
  return (
    <li className="space-y-2 p-4">
      <p className="text-sm">
        <span className="font-mono text-ink-900">switches.{sw.key}</span>{" "}
        <span className={sw.enabled ? "text-primary-700" : "text-ink-500"}>
          · {sw.enabled ? "activé par le client" : "coupé"}
        </span>
      </p>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-500">
          Libellé client
          <input name="label" defaultValue={sw.label} className={`mt-0.5 block w-72 ${input}`} />
        </label>
        <label className="text-xs text-ink-500">
          Précision (facultatif)
          <input name="help" defaultValue={sw.help ?? ""} className={`mt-0.5 block w-72 ${input}`} />
        </label>
        <label className="text-xs text-ink-500">
          Ordre
          <input
            name="position"
            type="number"
            min={0}
            defaultValue={sw.position}
            className={`mt-0.5 block w-16 ${input}`}
          />
        </label>
        <button type="submit" disabled={pending} className={button}>
          {pending ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          disabled={removing}
          onClick={() => startRemove(async () => setRemoveState(await deleteSwitch(path, sw.id)))}
          className="px-2 py-1 text-sm text-red-700 disabled:opacity-60"
        >
          Supprimer
        </button>
      </form>
      <Feedback state={state} />
      <Feedback state={removeState} />
    </li>
  );
}

export function NewSwitchForm({ assistantId, path }: { assistantId: string; path: string }) {
  const [state, action, pending] = useActionState<SetupActionState, FormData>(
    createSwitch.bind(null, path, assistantId),
    {},
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-ink-500">
        Clé (lue par le flux)
        <input name="key" placeholder="rendez_vous" className={`mt-0.5 block w-40 font-mono ${input}`} />
      </label>
      <label className="text-xs text-ink-500">
        Libellé client
        <input name="label" placeholder="Il prend les rendez-vous" className={`mt-0.5 block w-72 ${input}`} />
      </label>
      <label className="text-xs text-ink-500">
        Précision (facultatif)
        <input name="help" className={`mt-0.5 block w-72 ${input}`} />
      </label>
      <label className="text-xs text-ink-500">
        Ordre
        <input name="position" type="number" min={0} defaultValue={0} className={`mt-0.5 block w-16 ${input}`} />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-500">
        <input name="enabled" type="checkbox" /> activé au départ
      </label>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "…" : "Ajouter"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
