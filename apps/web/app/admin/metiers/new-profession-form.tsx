"use client";

import { useActionState } from "react";
import { createProfession, type ActionState } from "../actions";

const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";

export function NewProfessionForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProfession, {});

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-ink-100 bg-white p-6 sm:grid-cols-2">
      <label className="text-sm font-semibold text-ink-700">
        Slug (URL)
        <input name="slug" required placeholder="pharmacien" className={field} />
      </label>
      <label className="text-sm font-semibold text-ink-700">
        Nom affiché
        <input name="name" required placeholder="Pharmacie" className={field} />
      </label>
      <label className="text-sm font-semibold text-ink-700">
        Secteur
        <input name="sector" required placeholder="Santé" className={field} />
      </label>
      <label className="text-sm font-semibold text-ink-700">
        Prix mensuel (€)
        <input name="monthlyPriceEur" type="number" defaultValue={89} className={field} />
      </label>
      <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
        Phrase de bénéfice (carte)
        <input name="benefit" required className={field} />
      </label>
      <label className="text-sm font-semibold text-ink-700 sm:col-span-2">
        Besoins (séparés par des virgules)
        <input name="needs" placeholder="Prendre les rendez-vous, Répondre au téléphone" className={field} />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-touch rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {pending ? "Création…" : "Créer le métier"}
      </button>
    </form>
  );
}
