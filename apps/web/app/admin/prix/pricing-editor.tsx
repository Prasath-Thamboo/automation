"use client";

import { useActionState, useState } from "react";
import type { AdminPricingRule } from "@tando/api-client";
import { createRule, deleteRule, updateRule, type PricingActionState } from "./actions";

const KIND_LABEL: Record<string, string> = {
  socle: "Socle (par formule)",
  module: "Module (par tâche)",
  volume: "Volume (coefficient)",
  outil: "Outil (connexion)",
};

const numInput =
  "w-24 rounded-md border border-ink-100 px-2 py-1 text-sm";

export function RuleRow({ rule }: { rule: AdminPricingRule }) {
  const [state, action, pending] = useActionState<PricingActionState, FormData>(
    updateRule.bind(null, rule.id),
    {},
  );

  return (
    <tr className="align-top">
      <td className="border-b border-ink-100 py-2 pr-3 text-xs text-ink-500">
        {rule.kind}
        <span className="block font-mono text-ink-700">{rule.key}</span>
      </td>
      <td className="border-b border-ink-100 py-2 pr-3" colSpan={6}>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="label"
            defaultValue={rule.label}
            className="min-w-[12rem] flex-1 rounded-md border border-ink-100 px-2 py-1 text-sm"
          />
          <label className="text-xs text-ink-500">
            Mise en service €
            <input
              name="setupEur"
              type="number"
              step="1"
              defaultValue={rule.setupEur}
              className={`mt-0.5 block ${numInput}`}
            />
          </label>
          <label className="text-xs text-ink-500">
            Mensuel €
            <input
              name="monthlyEur"
              type="number"
              step="1"
              defaultValue={rule.monthlyEur}
              className={`mt-0.5 block ${numInput}`}
            />
          </label>
          <label className="text-xs text-ink-500">
            Facteur
            <input
              name="factor"
              type="number"
              step="0.1"
              defaultValue={rule.factor}
              className={`mt-0.5 block ${numInput}`}
            />
          </label>
          <label className="text-xs text-ink-500">
            Ordre
            <input
              name="position"
              type="number"
              step="1"
              defaultValue={rule.position}
              className={`mt-0.5 block w-16 rounded-md border border-ink-100 px-2 py-1 text-sm`}
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-ink-600">
            <input type="checkbox" name="active" defaultChecked={rule.active} /> Active
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-touch rounded-md bg-primary-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "…" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer la règle « ${rule.label} » ?`)) void deleteRule(rule.id);
            }}
            className="text-sm font-semibold text-danger"
          >
            Supprimer
          </button>
          {state.ok ? <span className="text-xs text-primary-700">{state.ok}</span> : null}
          {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
        </form>
      </td>
    </tr>
  );
}

export function NewRuleForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PricingActionState, FormData>(createRule, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-primary-700"
      >
        + Ajouter une règle
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink-100 p-4">
      <label className="text-xs font-semibold text-ink-700">
        Type
        <select name="kind" className="mt-1 block rounded-md border border-ink-100 px-2 py-1 text-sm">
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Clé
        <input
          name="key"
          required
          placeholder="prise-rdv"
          className="mt-1 block rounded-md border border-ink-100 px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Libellé
        <input name="label" required className="mt-1 block rounded-md border border-ink-100 px-2 py-1 text-sm" />
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Mise en service €
        <input name="setupEur" type="number" step="1" defaultValue={0} className={`mt-1 block ${numInput}`} />
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Mensuel €
        <input name="monthlyEur" type="number" step="1" defaultValue={0} className={`mt-1 block ${numInput}`} />
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Facteur
        <input name="factor" type="number" step="0.1" defaultValue={1} className={`mt-1 block ${numInput}`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-touch rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "Créer"}
      </button>
      {state.ok ? <span className="text-xs text-primary-700">{state.ok}</span> : null}
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}
