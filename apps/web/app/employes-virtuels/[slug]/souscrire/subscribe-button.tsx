"use client";

import { useState, useTransition } from "react";
import { subscribeCopy } from "@velekya/copy";
import { subscribeToProfession } from "@/app/mon-equipe/team-actions";

export function SubscribeButton({ slug, name }: { slug: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        data-testid="subscribe"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await subscribeToProfession(slug);
            if (res?.error) setError(res.error);
          })
        }
        className="min-h-[60px] rounded-full bg-primary-600 px-8 py-4 text-lg font-bold text-white shadow-glow transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? subscribeCopy.confirming : subscribeCopy.confirm(name)}
      </button>
      {error ? (
        <p role="alert" className="text-base text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
