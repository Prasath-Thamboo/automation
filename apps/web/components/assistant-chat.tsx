"use client";

import { useRef, useState, useTransition } from "react";
import { simulateMessage } from "@/app/mon-equipe/team-actions";

interface Line {
  from: "vous" | "assistant" | "systeme";
  text: string;
}

/** Fenêtre d'essai : on écrit comme un client, l'assistant répond via le moteur. */
export function AssistantChat({ assistantId, name }: { assistantId: string; name: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function send() {
    const text = draft.trim();
    if (!text || pending) return;
    setLines((l) => [...l, { from: "vous", text }]);
    setDraft("");
    start(async () => {
      const t = await simulateMessage(assistantId, text, sessionId);
      setSessionId(t.sessionId);
      if (t.error) {
        setLines((l) => [...l, { from: "systeme", text: t.error! }]);
        return;
      }
      if (t.reply) setLines((l) => [...l, { from: "assistant", text: t.reply }]);
      if (t.escalated) {
        setLines((l) => [
          ...l,
          { from: "systeme", text: `${name} vous a transmis cette demande. Vous la retrouvez dans « à valider ».` },
        ]);
      }
      requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
    });
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="text-sm text-ink-500">
            Écrivez un message comme le ferait un de vos clients pour voir {name} répondre.
          </p>
        ) : null}
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.from === "vous"
                ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-ink-100 px-3 py-1.5 text-sm"
                : l.from === "assistant"
                  ? "max-w-[85%] rounded-lg rounded-bl-sm bg-primary-50 px-3 py-1.5 text-sm"
                  : "text-xs italic text-ink-500"
            }
          >
            {l.text}
          </div>
        ))}
        {pending ? <p className="text-xs text-ink-500">{name} écrit…</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bonjour, je voudrais un rendez-vous…"
          className="min-h-touch flex-1 rounded-md border border-ink-100 px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="min-h-touch rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
