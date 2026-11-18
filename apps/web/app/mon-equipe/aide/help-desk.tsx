"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { HelpReply, HelpRequestItem, HelpTopic } from "@velekya/api-client";
import { helpCopy } from "@velekya/copy";
import { askHelp, sendHelpFeedback, transmitHelp } from "./actions";
import { helpLink } from "./help-links";

interface Turn {
  question: string;
  request: HelpRequestItem;
  suggestions: HelpTopic[];
  feedbackSent?: boolean;
}

/**
 * Fenêtre « Une question ? » : le patron écrit, la réponse toute prête s'affiche
 * avec un renvoi vers le bon écran. Sans réponse sûre : des pistes et la
 * transmission à l'équipe Velekya — jamais de réponse inventée.
 */
export function HelpDesk({ topics }: { topics: HelpTopic[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
  }

  function ask(question: string, articleId?: string) {
    const text = question.trim();
    if (text.length < 3 || pending) return;
    setError(undefined);
    setDraft("");
    start(async () => {
      const res = await askHelp(text, articleId);
      if (res.error || !res.reply) {
        setError(res.error ?? helpCopy.error);
        setDraft(text);
        return;
      }
      const reply: HelpReply = res.reply;
      setTurns((t) => [...t, { question: text, request: reply.request, suggestions: reply.suggestions }]);
      scrollDown();
    });
  }

  function update(id: string, patch: Partial<Turn>) {
    setTurns((all) => all.map((t) => (t.request.id === id ? { ...t, ...patch } : t)));
  }

  function feedback(id: string, helpful: boolean) {
    start(async () => {
      const res = await sendHelpFeedback(id, helpful);
      if (res.item) update(id, { request: res.item, feedbackSent: true });
      else setError(res.error);
    });
  }

  function transmit(id: string) {
    start(async () => {
      const res = await transmitHelp(id);
      if (res.item) update(id, { request: res.item });
      else setError(res.error);
      scrollDown();
    });
  }

  return (
    <div className="card flex flex-col gap-5 p-5 sm:p-6">
      <div ref={listRef} aria-live="polite" className="max-h-[32rem] space-y-5 overflow-y-auto">
        {turns.map((turn) => {
          const r = turn.request;
          const link = r.answer ? helpLink(r.action) : null;
          const canTransmit =
            r.status === "sans_reponse" || (r.status === "repondue" && r.helpful === false);
          return (
            <div key={r.id} className="space-y-3">
              <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-ink-100 px-4 py-2 text-base text-ink-900">
                <span className="sr-only">{helpCopy.you} : </span>
                {turn.question}
              </p>

              <div className="max-w-[90%] space-y-3 rounded-lg rounded-bl-sm bg-primary-50 px-4 py-3 text-base text-ink-900">
                <span className="sr-only">{helpCopy.velekya} : </span>
                {r.answer ? (
                  <>
                    <p className="whitespace-pre-line">{r.answer}</p>
                    {link ? (
                      <Link href={link.href} className="inline-block font-semibold text-primary-700">
                        {link.label} →
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <p>{helpCopy.noAnswer}</p>
                )}

                {turn.suggestions.length > 0 ? (
                  <div>
                    <p className="text-sm font-bold text-ink-700">{helpCopy.maybe}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {turn.suggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => ask(s.question, s.id)}
                            disabled={pending}
                            className="min-h-touch rounded-full border border-primary-300 bg-white px-4 py-2 text-left text-sm font-semibold text-primary-800 hover:bg-primary-100 disabled:opacity-50"
                          >
                            {s.question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {r.status === "repondue" && !turn.feedbackSent ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-primary-100 pt-3">
                    <span className="text-sm text-ink-700">{helpCopy.helpfulQuestion}</span>
                    <button
                      type="button"
                      onClick={() => feedback(r.id, true)}
                      disabled={pending}
                      className="min-h-touch rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink-800 hover:bg-primary-100 disabled:opacity-50"
                    >
                      {helpCopy.helpfulYes}
                    </button>
                    <button
                      type="button"
                      onClick={() => feedback(r.id, false)}
                      disabled={pending}
                      className="min-h-touch rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink-800 hover:bg-primary-100 disabled:opacity-50"
                    >
                      {helpCopy.helpfulNo}
                    </button>
                  </div>
                ) : null}
                {turn.feedbackSent && r.helpful ? (
                  <p className="text-sm text-ink-600">{helpCopy.thanks}</p>
                ) : null}

                {canTransmit ? (
                  <button
                    type="button"
                    onClick={() => transmit(r.id)}
                    disabled={pending}
                    className="min-h-touch rounded-full bg-primary-600 px-5 py-2 text-sm font-bold text-white shadow-soft hover:bg-primary-700 disabled:opacity-50"
                  >
                    {helpCopy.transmit}
                  </button>
                ) : null}
                {r.status === "transmise" ? (
                  <p className="font-semibold text-primary-800">{helpCopy.transmitted}</p>
                ) : null}
              </div>
            </div>
          );
        })}
        {pending ? <p className="text-sm text-ink-500">{helpCopy.asking}</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="help-question" className="sr-only">
          {helpCopy.title}
        </label>
        <input
          id="help-question"
          data-testid="help-question"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={helpCopy.placeholder}
          maxLength={500}
          className="min-h-touch flex-1 rounded-md border border-ink-200 px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length < 3}
          className="min-h-[52px] rounded-full bg-primary-600 px-6 py-3 text-base font-bold text-white shadow-soft transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? helpCopy.asking : helpCopy.ask}
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-base text-danger">
          {error}
        </p>
      ) : null}

      {topics.length > 0 ? (
        <div>
          <h2 className="text-base font-bold text-ink-900">{helpCopy.topicsTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => ask(t.question, t.id)}
                  disabled={pending}
                  className="min-h-touch rounded-full border border-ink-200 bg-white px-4 py-2 text-left text-sm font-semibold text-ink-800 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50"
                >
                  {t.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
