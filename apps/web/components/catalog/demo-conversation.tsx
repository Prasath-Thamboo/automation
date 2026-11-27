"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateContent } from "@velekya/api-client";

type Demo = TemplateContent["demo"];

/**
 * Démonstration jouable directement dans la page (§5.1 point 5). Pré-scriptée,
 * aucune inscription. Les messages apparaissent l'un après l'autre ; si le
 * visiteur préfère moins d'animations, tout s'affiche d'un coup.
 */
export function DemoConversation({ demo, assistantName }: { demo: Demo; assistantName: string }) {
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!started) return;
    if (shown >= demo.messages.length) return;
    if (reduceMotion) {
      setShown(demo.messages.length);
      return;
    }
    timer.current = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 250 : 900);
    return () => clearTimeout(timer.current);
  }, [started, shown, demo.messages.length, reduceMotion]);

  function play() {
    setShown(0);
    setStarted(true);
  }

  const done = started && shown >= demo.messages.length;

  return (
    <div className="rounded-lg bg-paper p-5 sm:p-6">
      <p className="text-base text-ink-700">{demo.intro}</p>

      {!started ? (
        <button
          type="button"
          onClick={play}
          className="mt-4 inline-flex min-h-touch items-center rounded-lg bg-accent-600 px-5 py-2 text-base font-semibold text-white hover:bg-accent-700 shadow-soft transition-colors"
        >
          Voir la conversation
        </button>
      ) : (
        <ul className="mt-4 space-y-3" aria-live="polite">
          {demo.messages.slice(0, shown).map((m, i) => (
            <li
              key={i}
              className={
                m.from === "assistant"
                  ? "max-w-[85%] rounded-lg rounded-bl-sm bg-primary-100 px-4 py-3 text-base text-ink-900"
                  : "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-white px-4 py-3 text-base text-ink-900 shadow-soft"
              }
            >
              <span className="mb-0.5 block text-sm font-bold text-ink-700">
                {m.from === "assistant" ? assistantName : "Client"}
              </span>
              {m.text}
            </li>
          ))}
        </ul>
      )}

      {done ? (
        <button
          type="button"
          onClick={play}
          className="mt-4 inline-flex min-h-touch items-center rounded-lg border-2 border-primary-900 px-5 py-2 text-base font-semibold text-primary-900 hover:bg-primary-50 bg-white transition-colors"
        >
          Rejouer
        </button>
      ) : null}
    </div>
  );
}
