"use client";

import { useState, useTransition } from "react";
import type { SavedCardView } from "@velekya/api-client";
import { savedCardCopy as c } from "@velekya/copy";
import { removeCard, saveCard } from "./actions";

/** Lot 22 — section « Prélèvement automatique » de « Mes documents ». */
export function SavedCardSection({
  card,
  canManage,
  returned,
}: {
  card: SavedCardView | null;
  canManage: boolean;
  returned: "ok" | "annule" | null;
}) {
  const [pending, start] = useTransition();
  const [action, setAction] = useState<"save" | "remove" | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: "ok" | "error" } | null>(
    returned === "ok"
      ? { text: c.returnedOk, tone: "ok" }
      : returned === "annule"
        ? { text: c.returnedCancel, tone: "error" }
        : null,
  );

  const run = (kind: "save" | "remove") => {
    setAction(kind);
    start(async () => {
      const r = kind === "save" ? await saveCard() : await removeCard();
      setFeedback(
        r.error
          ? { text: r.error, tone: "error" }
          : { text: kind === "save" ? c.saved : c.removed, tone: "ok" },
      );
    });
  };

  const button =
    "min-h-touch rounded-full px-5 py-2 text-sm font-bold disabled:opacity-60 transition-colors";

  return (
    <div className="mt-6 rounded-lg border border-ink-100 bg-white p-5 shadow-soft" data-testid="saved-card">
      <h2 className="text-lg font-bold text-ink-900">{c.title}</h2>

      {card ? (
        <>
          <p className="mt-2 text-base text-ink-900" data-testid="saved-card-label">
            <strong>{c.card(card.brand, card.last4)}</strong>
            {card.expMonth && card.expYear ? ` · ${c.expires(card.expMonth, card.expYear)}` : ""}
          </p>
          <p className="mt-1 text-base text-ink-700">{c.active}</p>
        </>
      ) : (
        <p className="mt-2 text-base text-ink-700">{c.none}</p>
      )}

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run("save")}
            className={`${button} bg-primary-600 text-white shadow-soft hover:bg-primary-700`}
          >
            {pending && action === "save" ? c.adding : card ? c.replace : c.add}
          </button>
          {card ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("remove")}
              className={`${button} border border-ink-200 text-ink-700 hover:bg-ink-50`}
            >
              {pending && action === "remove" ? c.removing : c.remove}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-500">{c.ownerOnly}</p>
      )}

      {feedback ? (
        <p
          role="status"
          className={`mt-3 text-sm ${feedback.tone === "ok" ? "text-primary-700" : "text-danger"}`}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
