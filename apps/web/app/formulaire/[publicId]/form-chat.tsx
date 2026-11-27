"use client";

import { useRef, useState, useTransition } from "react";
import { publicForm } from "@velekya/copy";
import { browserApi } from "@/lib/browser-api";

interface Line {
  from: "vous" | "eux" | "systeme";
  text: string;
}

const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";

function readSession(publicId: string): string | undefined {
  try {
    return sessionStorage.getItem(`velekya_form_${publicId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeSession(publicId: string, id: string): void {
  try {
    sessionStorage.setItem(`velekya_form_${publicId}`, id);
  } catch {
    /* stockage indisponible : la discussion repartira de zéro au rechargement */
  }
}

/** Échange avec le visiteur : premier message avec ses coordonnées, puis fil de discussion. */
export function FormChat({ publicId, establishment }: { publicId: string; establishment: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const started = lines.length > 0;

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setLines((l) => [...l, { from: "vous", text }]);
    setDraft("");
    start(async () => {
      try {
        const r = await browserApi().form.send(publicId, {
          text,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          sessionId: readSession(publicId),
          website: website || undefined,
        });
        writeSession(publicId, r.sessionId);
        const answer =
          r.reply ?? (email.trim() ? publicForm.receivedWithEmail : publicForm.received);
        setLines((l) => [...l, { from: r.reply ? "eux" : "systeme", text: answer }]);
      } catch {
        setLines((l) => [...l, { from: "systeme", text: publicForm.error }]);
      }
      requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
    });
  }

  return (
    <form onSubmit={send} className="mt-6 flex flex-col gap-4">
      {started ? (
        <div
          ref={listRef}
          aria-live="polite"
          className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border border-ink-100 bg-white p-4 shadow-soft"
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={
                line.from === "vous"
                  ? "self-end rounded-lg bg-primary-900 px-3 py-2 text-base text-white"
                  : line.from === "eux"
                    ? "self-start rounded-lg bg-ink-50 px-3 py-2 text-base text-ink-900"
                    : "self-center text-center text-sm text-ink-600"
              }
            >
              <span className="sr-only">{line.from === "vous" ? publicForm.you : establishment} : </span>
              {line.text}
            </div>
          ))}
        </div>
      ) : (
        <>
          <label className="text-base font-semibold text-ink-900">
            {publicForm.nameLabel}
            <input
              className={field}
              value={name}
              autoComplete="given-name"
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-base font-semibold text-ink-900">
            {publicForm.emailLabel}
            <input
              className={field}
              type="email"
              value={email}
              autoComplete="email"
              maxLength={200}
              aria-describedby="form-email-hint"
              onChange={(e) => setEmail(e.target.value)}
            />
            <span id="form-email-hint" className="mt-1 block text-sm font-normal text-ink-600">
              {publicForm.emailHint}
            </span>
          </label>
        </>
      )}

      {/* Piège à robots : invisible pour les humains et les lecteurs d'écran. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      <label className="text-base font-semibold text-ink-900">
        {publicForm.messageLabel}
        <textarea
          className={`${field} min-h-24`}
          value={draft}
          required
          maxLength={2000}
          placeholder={publicForm.messagePlaceholder}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={pending || !draft.trim()}
        className="min-h-11 rounded-lg bg-accent-600 px-5 py-2 text-base font-semibold text-white disabled:opacity-60 shadow-soft transition-colors hover:bg-accent-700"
      >
        {pending ? publicForm.sending : publicForm.send}
      </button>
    </form>
  );
}
