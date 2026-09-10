"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdminMissionDetail, MissionChecklistItem } from "@tando/api-client";
import { saveChecklist, setMissionStatus, type MissionActionState } from "../actions";

const STATUS: Record<string, string> = {
  a_preparer: "À préparer",
  en_preparation: "En préparation",
  en_service: "En service",
  annulee: "Annulée",
};
const ORDER = ["a_preparer", "en_preparation", "en_service", "annulee"];

export function StatusControls({ mission }: { mission: AdminMissionDetail }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<MissionActionState>({});

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ORDER.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === mission.status}
            onClick={() =>
              start(async () => {
                setMessage(await setMissionStatus(mission.id, s));
              })
            }
            className={`min-h-touch rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
              s === mission.status
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-ink-100 text-ink-700 hover:border-primary-600"
            }`}
          >
            {STATUS[s]}
          </button>
        ))}
      </div>
      {message.ok ? <p className="text-sm text-primary-700">{message.ok}</p> : null}
      {message.error ? <p className="text-sm text-danger">{message.error}</p> : null}
    </div>
  );
}

export function ChecklistEditor({
  missionId,
  initial,
}: {
  missionId: string;
  initial: MissionChecklistItem[];
}) {
  const [state, action, pending] = useActionState<MissionActionState, FormData>(
    saveChecklist.bind(null, missionId),
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <ul className="space-y-2">
        {initial.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <input type="hidden" name="label" value={item.label} />
            <input
              type="checkbox"
              name="done"
              value={i}
              defaultChecked={item.done}
              className="h-4 w-4"
            />
            <span className={item.done ? "text-ink-500 line-through" : "text-ink-800"}>
              {item.label}
            </span>
          </li>
        ))}
        {initial.length === 0 ? (
          <li className="text-sm text-ink-500">Aucune étape pour l&apos;instant.</li>
        ) : null}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-ink-700">
          Ajouter une étape
          <input
            name="newLabel"
            className="mt-1 block w-64 rounded-md border border-ink-100 px-2 py-1 text-sm"
            placeholder="Ex. : brancher l'agenda"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "…" : "Enregistrer la check-list"}
        </button>
      </div>
      {state.ok ? <p className="text-sm text-primary-700">{state.ok}</p> : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
