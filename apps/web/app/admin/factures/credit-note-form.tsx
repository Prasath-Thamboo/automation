"use client";

import { useActionState, useState } from "react";
import { issueCreditNote, type CreditState } from "./actions";

export function CreditNoteForm({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreditState, FormData>(
    issueCreditNote.bind(null, invoiceId),
    {},
  );

  if (!open && !state.ok) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-primary-700"
      >
        Émettre un avoir
      </button>
    );
  }
  if (state.ok) return <span className="text-sm text-primary-700">{state.ok}</span>;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-ink-700">
        Motif
        <input name="reason" required className="mt-1 block rounded-md border border-ink-100 px-2 py-1 text-sm" />
      </label>
      <label className="text-xs font-semibold text-ink-700">
        Montant TTC (€, vide = total)
        <input name="amountEur" type="number" step="0.01" className="mt-1 block w-28 rounded-md border border-ink-100 px-2 py-1 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-touch rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : "Valider l'avoir"}
      </button>
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}
