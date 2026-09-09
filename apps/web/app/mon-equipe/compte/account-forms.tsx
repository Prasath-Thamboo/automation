"use client";

import { useActionState, useState, useTransition } from "react";
import {
  cancelSubscription,
  deleteAccount,
  renameAccount,
  type FormState,
} from "@/app/mon-equipe/team-actions";

const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";

export function NameForm({ current }: { current: string }) {
  const [state, action, saving] = useActionState<FormState, FormData>(renameAccount, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="text-base font-semibold text-ink-900">
        Votre nom
        <input name="fullName" defaultValue={current} className={field} />
      </label>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-primary-700">Enregistré.</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="min-h-touch self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function ExportButton() {
  return (
    <a
      href="/mon-equipe/compte/export"
      className="inline-flex min-h-touch items-center rounded-md border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 no-underline"
    >
      Télécharger toutes mes données
    </a>
  );
}

export function CancelSubscriptionButton({ active }: { active: boolean }) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string>();
  if (!active) return <p className="text-sm text-ink-500">Aucun abonnement actif.</p>;
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Résilier l'abonnement ? Vos assistants seront mis en pause.")) return;
          start(async () => {
            const r = await cancelSubscription();
            setNotice(r.error ?? "Abonnement résilié.");
          });
        }}
        className="min-h-touch rounded-md border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-60"
      >
        Résilier mon abonnement
      </button>
      {notice ? <span className="text-sm text-ink-700">{notice}</span> : null}
    </div>
  );
}

export function DeleteAccountButton() {
  const [pending, start] = useTransition();
  const [confirmText, setConfirmText] = useState("");
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-ink-700">
        Cette action efface votre compte, vos assistants et leurs données. Elle est définitive.
      </p>
      <input
        placeholder='Tapez "SUPPRIMER" pour confirmer'
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="rounded-md border border-ink-100 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={pending || confirmText !== "SUPPRIMER"}
        onClick={() => start(() => deleteAccount())}
        className="min-h-touch rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "…" : "Supprimer définitivement mon compte"}
      </button>
    </div>
  );
}
