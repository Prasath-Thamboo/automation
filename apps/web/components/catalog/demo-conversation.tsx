"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateContent } from "@tando/api-client";

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
    <div className="rounded-lg border border-ink-100 bg-white p-5">
      <p className="text-base text-ink-700">{demo.intro}</p>

      {!started ? (
        <button
          type="button"
          onClick={play}
          className="mt-4 inline-flex min-h-touch items-center rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white hover:bg-primary-700"
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
                  ? "max-w-[85%] rounded-lg rounded-bl-sm bg-primary-50 px-4 py-2 text-base text-ink-900"
                  : "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-ink-100 px-4 py-2 text-base text-ink-900"
              }
            >
              <span className="mb-0.5 block text-xs font-semibold text-ink-500">
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
          className="mt-4 inline-flex min-h-touch items-center rounded-md border border-primary-600 px-5 py-2 text-base font-semibold text-primary-700 hover:bg-primary-50"
        >
          Rejouer
        </button>
      ) : null}
    </div>
  );
}
