"use client";

import { useTransition, useState } from "react";
import { subscribeToProfession } from "@/app/mon-equipe/team-actions";

export function SubscribeButton({ slug, name }: { slug: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await subscribeToProfession(slug);
            } catch {
              setError("La souscription n'a pas abouti. Réessayez.");
            }
          })
        }
        className="min-h-touch rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "…" : `Mettre ${name} au travail`}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
