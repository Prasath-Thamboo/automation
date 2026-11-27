"use client";

import { useActionState } from "react";
import type { AdminProfessionWorkflow } from "@velekya/api-client";
import { saveProfessionWorkflow, type WorkflowActionState } from "./workflow-actions";

const input = "w-full rounded-md border border-ink-100 px-2 py-1 font-mono text-sm";

/** Lot 16 — flux n8n générique du métier, partagé par tous ses clients « prêt à l'emploi ». */
export function WorkflowEditor({ workflow }: { workflow: AdminProfessionWorkflow }) {
  const [state, action, pending] = useActionState<WorkflowActionState, FormData>(
    saveProfessionWorkflow.bind(null, workflow.professionId),
    {},
  );
  const lines = workflow.defaultSwitches
    .map((s) => [s.key, s.label, s.help ?? "", s.enabled ? "on" : ""].join(" | ").replace(/( \| )+$/, ""))
    .join("\n");

  return (
    <section className="space-y-3 rounded-lg border border-ink-100 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Flux n8n générique (prêt à l&apos;emploi)</h2>
        <p className="mt-1 text-sm text-ink-500">
          Un seul flux pour tous les clients de ce métier : chaque appel porte les données du client
          (établissement, spécificités, consignes, boutons, historique). Un client avec un flux propre
          (page Pilotage) garde le sien. Sans flux : moteur à règles. Actuellement{" "}
          <strong>{workflow.assistantsOnFlow}</strong> employé(s) passent par ce flux. Flux planifiés :{" "}
          <code>GET /api/v1/n8n/professions/{workflow.slug}/assistants</code>.
        </p>
      </div>
      <form action={action} className="space-y-3">
        <label className="block text-xs text-ink-500">
          Webhook du flux (vide = débrancher)
          <input
            name="workflowUrl"
            defaultValue={workflow.workflowUrl ?? ""}
            placeholder="https://n8n.velekya.fr/webhook/metier-dentiste"
            className={`mt-0.5 ${input}`}
          />
        </label>
        <label className="block text-xs text-ink-500">
          Boutons par défaut des nouveaux employés — une ligne par bouton :{" "}
          <code>clé | libellé client | aide | on</code> (aide et « on » facultatifs). S&apos;applique
          aux embauches suivantes uniquement.
          <textarea
            name="switches"
            rows={5}
            defaultValue={lines}
            placeholder={"rappel_rdv | Il rappelle les rendez-vous la veille | Par SMS ou email | on"}
            className={`mt-0.5 ${input}`}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-primary-700">{state.ok}</p> : null}
        </div>
      </form>
    </section>
  );
}
