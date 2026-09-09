"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  questionnaire,
  questionnaireCopy as C,
  type Question,
} from "@tando/copy";
import type { AssessmentAnswers, JobDescriptionContent } from "@tando/api-client";
import { browserApi, getAssessmentToken, setAssessmentToken } from "@/lib/browser-api";

type Phase = "loading" | "start" | "questions" | "review" | "done";

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v : []);
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

function isVisible(q: Question, answers: AssessmentAnswers): boolean {
  if (!q.visibleIf) return true;
  const val = answers[q.visibleIf.key];
  const has = Array.isArray(val) ? val : val ? [val] : [];
  return q.visibleIf.anyOf.some((v) => has.includes(v));
}

function isAnswered(q: Question, answers: AssessmentAnswers): boolean {
  if (q.optional) return true;
  const v = answers[q.id];
  if (q.kind === "multi") return asArray(v).length >= (q.minSelected ?? 1);
  if (q.kind === "contact") {
    return (q.contactFields ?? []).every(
      (f) => f.optional || asString(answers[f.key]).trim().length > 0,
    );
  }
  return asString(v).trim().length > 0;
}

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const joinLines = (a: string[]) => a.join("\n");

export function QuestionnaireClient() {
  // On démarre sur l'écran d'accueil (rendu côté serveur) ; l'effet ci-dessous
  // bascule vers la reprise si un parcours est déjà enregistré sur cet appareil.
  const [phase, setPhase] = useState<Phase>("start");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [jd, setJd] = useState<JobDescriptionContent | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const visibleQuestions = useMemo(
    () => questionnaire.filter((q) => isVisible(q, answers)),
    [answers],
  );
  const total = visibleQuestions.length;
  const current = visibleQuestions[Math.min(stepIndex, total - 1)];

  useEffect(() => {
    const token = getAssessmentToken();
    if (!token) return;
    setPhase("loading");
    browserApi()
      .assessments.current()
      .then((s) => {
        setAnswers(s.answers);
        if (s.completed) {
          setQuoteNumber(s.quoteNumber);
          setPhase("done");
        } else {
          setStepIndex(Math.min(s.currentStep, questionnaire.length - 1));
          setPhase("questions");
        }
      })
      .catch(() => setPhase("start"));
  }, []);

  const save = useCallback(
    async (next: AssessmentAnswers, step: number) => {
      try {
        await browserApi().assessments.save({
          answers: next as Record<string, string | string[]>,
          currentStep: step,
        });
      } catch {
        /* silencieux : on retentera au prochain écran */
      }
    },
    [],
  );

  async function start() {
    setError(undefined);
    setBusy(true);
    try {
      const res = await browserApi().assessments.start(email.trim());
      setAssessmentToken(res.resumeToken);
      setAnswers(res.state.answers);
      setPhase("questions");
    } catch {
      setError("On n'a pas pu démarrer. Vérifiez votre email et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function setAnswer(key: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function next() {
    if (current && !isAnswered(current, answers)) {
      setError("Merci de répondre avant de continuer.");
      return;
    }
    setError(undefined);
    if (stepIndex < total - 1) {
      const step = stepIndex + 1;
      setStepIndex(step);
      void save(answers, step);
      return;
    }
    // Dernière question -> fiche de poste
    setBusy(true);
    try {
      await save(answers, stepIndex);
      const preview = await browserApi().assessments.preview();
      setJd(preview);
      setPhase("review");
    } catch {
      setError("Un souci est survenu. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setError(undefined);
    if (phase === "review") {
      setPhase("questions");
      return;
    }
    if (stepIndex > 0) {
      const step = stepIndex - 1;
      setStepIndex(step);
      void save(answers, step);
    }
  }

  async function submit() {
    if (!jd) return;
    setBusy(true);
    setError(undefined);
    try {
      const s = await browserApi().assessments.submit({ jobDescription: jd });
      setQuoteNumber(s.quoteNumber);
      setPhase("done");
    } catch {
      setError("L'envoi n'a pas abouti. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return <p className="text-ink-500">Un instant…</p>;
  }

  if (phase === "start") {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold text-ink-900">{C.start.title}</h1>
        <p className="mt-4 text-lg text-ink-700">{C.start.body}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
          className="mt-6 flex flex-col gap-3"
        >
          <label className="text-base font-semibold text-ink-900">
            {C.start.emailLabel}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base"
              placeholder="vous@votre-entreprise.fr"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-touch self-start rounded-md bg-primary-600 px-6 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {busy ? "…" : C.start.cta}
          </button>
        </form>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section className="max-w-xl">
        <h1 className="text-3xl font-bold text-ink-900">{C.review.submitted.title}</h1>
        <p className="mt-4 text-lg text-ink-700">{C.review.submitted.body}</p>
        {quoteNumber ? (
          <p className="mt-4 text-base text-ink-500">Référence : {quoteNumber}</p>
        ) : null}
        <Link href="/" className="mt-6 inline-block font-semibold text-primary-700">
          Revenir à l&apos;accueil
        </Link>
      </section>
    );
  }

  if (phase === "review" && jd) {
    return (
      <section className="max-w-xl">
        <h1 className="text-2xl font-bold text-ink-900">{C.review.title}</h1>
        <p className="mt-3 text-base text-ink-700">{C.review.body}</p>

        <div className="mt-6 space-y-5">
          <Editable label="En résumé" value={jd.summary} onChange={(v) => setJd({ ...jd, summary: v })} rows={3} />
          <Editable label={C.review.tasksTitle} value={joinLines(jd.tasks)} onChange={(v) => setJd({ ...jd, tasks: lines(v) })} rows={5} />
          <Editable label={C.review.channelsTitle} value={joinLines(jd.channels)} onChange={(v) => setJd({ ...jd, channels: lines(v) })} rows={3} />
          <Editable label={C.review.hoursTitle} value={jd.hours} onChange={(v) => setJd({ ...jd, hours: v })} rows={2} />
          <Editable label={C.review.limitsTitle} value={joinLines(jd.limits)} onChange={(v) => setJd({ ...jd, limits: lines(v) })} rows={4} />
          <Editable label={C.review.toneTitle} value={jd.tone} onChange={(v) => setJd({ ...jd, tone: v })} rows={2} />
          <Editable label={C.review.toolsTitle} value={joinLines(jd.tools)} onChange={(v) => setJd({ ...jd, tools: lines(v) })} rows={3} />
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={back}
            className="min-h-touch rounded-md border border-primary-600 px-5 py-2 text-base font-semibold text-primary-700"
          >
            {C.back}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="min-h-touch rounded-md bg-primary-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Envoi…" : C.review.submitCta}
          </button>
        </div>
      </section>
    );
  }

  // phase === "questions"
  if (!current) return null;
  return (
    <section className="max-w-xl">
      <div className="mb-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full bg-primary-600 transition-all"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-ink-500">{C.progress(stepIndex + 1, total)}</p>
      </div>

      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{current.theme}</p>
      <h1 className="mt-1 text-2xl font-bold text-ink-900">{current.title}</h1>
      {current.help ? <p className="mt-2 text-base text-ink-500">{current.help}</p> : null}

      <div className="mt-5">
        <QuestionControl q={current} answers={answers} setAnswer={setAnswer} />
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={stepIndex === 0}
          className="min-h-touch rounded-md px-4 py-2 text-base font-semibold text-ink-700 disabled:opacity-40"
        >
          {C.back}
        </button>
        <button
          type="button"
          onClick={() => void next()}
          disabled={busy}
          className="min-h-touch rounded-md bg-primary-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-60"
        >
          {stepIndex === total - 1 ? "Voir la fiche de poste" : C.next}
        </button>
      </div>
    </section>
  );
}

function Editable({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="block text-base font-semibold text-ink-900">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base font-normal"
      />
    </label>
  );
}

function QuestionControl({
  q,
  answers,
  setAnswer,
}: {
  q: Question;
  answers: AssessmentAnswers;
  setAnswer: (key: string, value: string | string[]) => void;
}) {
  if (q.kind === "textarea") {
    return (
      <textarea
        value={asString(answers[q.id])}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        rows={4}
        className="w-full rounded-md border border-ink-100 px-3 py-2 text-base"
      />
    );
  }

  if (q.kind === "text") {
    return (
      <input
        value={asString(answers[q.id])}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        className="min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base"
      />
    );
  }

  if (q.kind === "contact") {
    return (
      <div className="flex flex-col gap-3">
        {(q.contactFields ?? []).map((f) => (
          <label key={f.key} className="text-base font-semibold text-ink-900">
            {f.label}
            <input
              type={f.type}
              value={asString(answers[f.key])}
              onChange={(e) => setAnswer(f.key, e.target.value)}
              className="mt-1 min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base font-normal"
            />
          </label>
        ))}
      </div>
    );
  }

  const choices = q.allowOther
    ? [...(q.choices ?? []), { value: "autre", label: "Autre" }]
    : (q.choices ?? []);

  if (q.kind === "single") {
    const value = asString(answers[q.id]);
    return (
      <fieldset className="flex flex-col gap-2">
        {choices.map((c) => (
          <label
            key={c.value}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-base ${
              value === c.value ? "border-primary-600 bg-primary-50" : "border-ink-100 bg-white"
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === c.value}
              onChange={() => setAnswer(q.id, c.value)}
              className="mt-1 accent-primary-600"
            />
            <span>
              {c.label}
              {c.hint ? <span className="block text-sm text-ink-500">{c.hint}</span> : null}
            </span>
          </label>
        ))}
        {value === "autre" ? (
          <input
            placeholder="Précisez"
            value={asString(answers[`${q.id}Autre`])}
            onChange={(e) => setAnswer(`${q.id}Autre`, e.target.value)}
            className="min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base"
          />
        ) : null}
      </fieldset>
    );
  }

  // multi
  const selected = asArray(answers[q.id]);
  const toggle = (v: string) =>
    setAnswer(q.id, selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-col gap-2">
      {choices.map((c) => (
        <label
          key={c.value}
          className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-base ${
            selected.includes(c.value) ? "border-primary-600 bg-primary-50" : "border-ink-100 bg-white"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(c.value)}
            onChange={() => toggle(c.value)}
            className="mt-1 accent-primary-600"
          />
          <span>{c.label}</span>
        </label>
      ))}
      {q.freeText ? (
        <input
          placeholder={q.freeText.label}
          value={asString(answers[q.freeText.key])}
          onChange={(e) => setAnswer(q.freeText!.key, e.target.value)}
          className="min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base"
        />
      ) : null}
    </div>
  );
}
