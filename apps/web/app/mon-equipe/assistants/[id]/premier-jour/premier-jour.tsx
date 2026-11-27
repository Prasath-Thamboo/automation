"use client";

import { useState, useTransition } from "react";
import type { AssistantDetail } from "@velekya/api-client";
import { activateAssistant, saveOnboardingStep } from "@/app/mon-equipe/team-actions";
import { AssistantChat } from "@/components/assistant-chat";
import { channelsCopy } from "@velekya/copy";

const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";
const STEPS = ["Vos informations", "Vos spécificités", "Comment il vous joint", "Essai en direct"];

export function PremierJour({ assistant }: { assistant: AssistantDetail }) {
  const [step, setStep] = useState(Math.min(assistant.onboardingStep, 3));
  const [establishment, setEstablishment] = useState(assistant.establishment);
  const [specifics, setSpecifics] = useState<Record<string, string>>(assistant.specifics);
  const [contact, setContact] = useState({
    email: assistant.contactPrefs.email || "",
    phone: assistant.contactPrefs.phone || "",
    inbox: assistant.contactPrefs.inbox || "email",
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const hasSpecifics = assistant.specificQuestions.length > 0;
  const visibleSteps = hasSpecifics ? [0, 1, 2, 3] : [0, 2, 3];
  const stepIndex = visibleSteps.indexOf(step);

  function go(next: number, payload: Parameters<typeof saveOnboardingStep>[2]) {
    setError(undefined);
    start(async () => {
      const r = await saveOnboardingStep(assistant.id, next, payload);
      if (r.error) setError(r.error);
      else setStep(next);
    });
  }

  function finish() {
    setError(undefined);
    start(async () => {
      const r = await activateAssistant(assistant.id);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <section
      className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      data-testid="premier-jour"
      data-step={step}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">
        Le premier jour de {assistant.name}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full bg-accent-600 transition-all"
          style={{ width: `${((stepIndex + 1) / visibleSteps.length) * 100}%` }}
        />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">{STEPS[step]}</h1>

      {step === 0 ? (
        <div className="mt-6 flex flex-col gap-4" data-testid="pj-etape-informations">
          <label className="text-base font-semibold text-ink-900">
            Nom de l&apos;établissement
            <input
              className={field}
              data-testid="pj-nom"
              value={establishment.name}
              onChange={(e) => setEstablishment({ ...establishment, name: e.target.value })}
            />
          </label>
          <label className="text-base font-semibold text-ink-900">
            Adresse
            <input
              className={field}
              data-testid="pj-adresse"
              value={establishment.address}
              onChange={(e) => setEstablishment({ ...establishment, address: e.target.value })}
            />
          </label>
          <label className="text-base font-semibold text-ink-900">
            Horaires d&apos;ouverture
            <input
              className={field}
              data-testid="pj-horaires"
              placeholder="Lun-Ven 9h-18h, Sam 9h-12h"
              value={establishment.openingHours}
              onChange={(e) => setEstablishment({ ...establishment, openingHours: e.target.value })}
            />
          </label>
          <Nav
            pending={pending}
            onNext={() => go(hasSpecifics ? 1 : 2, { establishment })}
          />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 flex flex-col gap-4" data-testid="pj-etape-specificites">
          {assistant.specificQuestions.map((q) => (
            <label
              key={q.key}
              className="text-base font-semibold text-ink-900"
              data-testid={`pj-specifique-${q.key}`}
            >
              {q.label}
              {q.type === "textarea" ? (
                <textarea
                  rows={3}
                  className={field}
                  value={specifics[q.key] ?? ""}
                  onChange={(e) => setSpecifics({ ...specifics, [q.key]: e.target.value })}
                />
              ) : q.type === "boolean" ? (
                <select
                  className={field}
                  value={specifics[q.key] ?? ""}
                  onChange={(e) => setSpecifics({ ...specifics, [q.key]: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="oui">Oui</option>
                  <option value="non">Non</option>
                </select>
              ) : q.type === "choice" ? (
                <select
                  className={field}
                  value={specifics[q.key] ?? ""}
                  onChange={(e) => setSpecifics({ ...specifics, [q.key]: e.target.value })}
                >
                  <option value="">—</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={field}
                  value={specifics[q.key] ?? ""}
                  onChange={(e) => setSpecifics({ ...specifics, [q.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          <Nav pending={pending} onBack={() => setStep(0)} onNext={() => go(2, { specifics })} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 flex flex-col gap-4" data-testid="pj-etape-contact">
          <label className="text-base font-semibold text-ink-900">
            Votre email
            <input
              className={field}
              data-testid="pj-email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
          </label>
          <label className="text-base font-semibold text-ink-900">
            Votre téléphone
            <input
              className={field}
              data-testid="pj-telephone"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />
          </label>
          <label className="text-base font-semibold text-ink-900">
            Où doivent arriver ce qu&apos;il vous remonte ?
            <select
              className={field}
              data-testid="pj-reception"
              value={contact.inbox}
              onChange={(e) => setContact({ ...contact, inbox: e.target.value })}
            >
              <option value="email">Par email</option>
              <option value="sms">Par SMS</option>
              <option value="app">Dans l&apos;application seulement</option>
            </select>
          </label>
          <p className="text-sm text-ink-500">{channelsCopy.firstDayHint}</p>
          <Nav
            pending={pending}
            onBack={() => setStep(hasSpecifics ? 1 : 0)}
            onNext={() => go(3, { contactPrefs: contact })}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6" data-testid="pj-etape-essai">
          <p className="text-base text-ink-700">
            Essayez-le : écrivez comme un de vos clients. S&apos;il n&apos;est pas sûr, il vous
            transmettra la demande plutôt que d&apos;inventer.
          </p>
          <div className="mt-4">
            <AssistantChat assistantId={assistant.id} name={assistant.name} />
          </div>
          <p className="mt-6 text-base font-semibold text-ink-900">Ce qu&apos;il fera :</p>
          <ul className="mt-2 space-y-1">
            {assistant.tasks.map((t, i) => (
              <li key={i} className="flex gap-2 text-base text-ink-700">
                <span aria-hidden className="font-bold text-primary-600">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert" data-testid="pj-erreur">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              data-testid="pj-precedent"
              className="min-h-touch rounded-lg border-2 border-primary-900 px-5 py-2 text-base font-semibold text-primary-900 bg-white transition-colors hover:bg-primary-50"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={finish}
              data-testid="pj-commencer"
              className="min-h-touch rounded-lg bg-accent-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-60 shadow-soft transition-colors hover:bg-accent-700"
            >
              {pending ? "…" : "Il peut commencer"}
            </button>
          </div>
        </div>
      ) : null}

      {step !== 3 && error ? (
        <p className="mt-4 text-sm text-danger" role="alert" data-testid="pj-erreur">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Nav({
  pending,
  onBack,
  onNext,
}: {
  pending: boolean;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-2 flex gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          data-testid="pj-precedent"
          className="min-h-touch rounded-lg border-2 border-primary-900 px-5 py-2 text-base font-semibold text-primary-900 bg-white transition-colors hover:bg-primary-50"
        >
          Précédent
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={onNext}
        data-testid="pj-suivant"
        className="min-h-touch rounded-lg bg-accent-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-60 shadow-soft transition-colors hover:bg-accent-700"
      >
        {pending ? "…" : "Suivant"}
      </button>
    </div>
  );
}
