"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicQuote } from "@tando/api-client";
import { ApiError } from "@tando/api-client";
import { browserApi, API_BASE } from "@/lib/browser-api";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });

export function QuotePublicView({
  quote: initial,
  number,
  token,
}: {
  quote: PublicQuote;
  number: string;
  token: string;
}) {
  const [quote, setQuote] = useState(initial);
  const [name, setName] = useState(quote.content.contactName ?? "");
  const [cgv, setCgv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const jd = quote.content.jobDescription;
  const decided = quote.decided || quote.status === "expire";
  const documentUrl = browserApi().quotes.documentUrl(API_BASE, number, token);

  async function accept() {
    if (!cgv) {
      setError("Vous devez accepter les conditions générales.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      setQuote(await browserApi().quotes.accept(number, token, { name: name.trim(), cgv: true }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "L'acceptation n'a pas abouti. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function refuse() {
    if (!confirm("Refuser ce devis ?")) return;
    setBusy(true);
    try {
      setQuote(await browserApi().quotes.refuse(number, token));
    } catch {
      setError("Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm text-ink-500">Devis n° {quote.number}</p>
      <h1 className="mt-1 text-3xl font-bold text-ink-900">L&apos;employé qu&apos;on vous prépare</h1>
      <p className="mt-4 text-lg text-ink-700">{jd.summary}</p>

      <Section title="Ce qu'il fera pour vous">
        <List items={quote.content.benefits.length ? quote.content.benefits : jd.tasks} />
      </Section>
      <Section title="Là où il répondra">
        <List items={jd.channels} />
      </Section>
      <Section title="Ses horaires">
        <p className="text-base text-ink-700">{jd.hours}</p>
      </Section>
      <Section title="Ce qui n'est pas prévu dans ce devis">
        <List items={quote.content.outOfScope} muted />
      </Section>

      <Section title="Le prix">
        <div className="rounded-lg border border-ink-100 bg-white p-5">
          <p className="text-lg text-ink-900">
            Mise en service : <strong className="font-heading">{euro(quote.setupEur)}</strong>
          </p>
          <p className="mt-1 text-lg text-ink-900">
            <strong className="font-heading text-2xl">{euro(quote.monthlyEur)}</strong>
            <span className="text-ink-500"> / mois, TTC</span>
          </p>
          <p className="mt-3 text-sm text-ink-500">
            {quote.engagementMonths > 0 ? `Engagement ${quote.engagementMonths} mois` : "Sans engagement"}{" "}
            · Mise en service sous {quote.serviceDelayDays} jours
            {quote.expiresAt
              ? ` · Valable jusqu'au ${new Date(quote.expiresAt).toLocaleDateString("fr-FR")}`
              : ""}
          </p>
          <a href={documentUrl} target="_blank" rel="noopener" className="mt-3 inline-block text-sm font-semibold text-primary-700">
            Voir le devis détaillé (imprimable)
          </a>
        </div>
      </Section>

      {quote.status === "accepte" ? (
        <div className="mt-10 rounded-lg bg-primary-50 p-6">
          <h2 className="text-xl font-bold text-ink-900">C&apos;est accepté. Merci !</h2>
          <p className="mt-2 text-base text-ink-700">
            On commence à préparer votre employé virtuel. Vous recevrez un email dès qu&apos;il aura
            pris son poste, et vous pourrez le suivre depuis votre espace.
          </p>
          <Link href="/connexion" className="mt-3 inline-block font-semibold text-primary-700">
            Accéder à mon espace
          </Link>
        </div>
      ) : quote.status === "refuse" ? (
        <p className="mt-10 text-base text-ink-700">
          Ce devis a été refusé. Si vous changez d&apos;avis, écrivez-nous à bonjour@tando.fr.
        </p>
      ) : quote.status === "expire" ? (
        <p className="mt-10 text-base text-ink-700">
          Ce devis a expiré. Écrivez-nous à bonjour@tando.fr pour en obtenir un nouveau.
        </p>
      ) : (
        <div className="mt-10 rounded-lg border border-primary-600 p-6">
          <h2 className="text-xl font-bold text-ink-900">Accepter ce devis</h2>
          <p className="mt-2 text-sm text-ink-500">
            En acceptant, vous validez ce périmètre et les conditions générales. La date, votre nom
            et votre adresse IP sont conservés comme preuve.
          </p>
          <label className="mt-4 block text-base font-semibold text-ink-900">
            Votre nom
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 min-h-touch w-full rounded-md border border-ink-100 px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="mt-3 flex items-start gap-2 text-base text-ink-700">
            <input type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} className="mt-1 accent-primary-600" />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgv" className="font-semibold text-primary-700">
                conditions générales
              </Link>
              .
            </span>
          </label>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || decided || name.trim().length < 2}
              onClick={() => void accept()}
              className="min-h-touch rounded-md bg-primary-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-50"
            >
              {busy ? "…" : "J'accepte"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refuse()}
              className="min-h-touch rounded-md px-4 py-2 text-base font-semibold text-ink-700"
            >
              Ce n&apos;est pas pour moi
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mt-10 text-xl font-bold text-ink-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((i, k) => (
        <li key={k} className="flex gap-3 text-base text-ink-700">
          <span aria-hidden className={muted ? "text-ink-500" : "font-bold text-primary-600"}>
            {muted ? "—" : "✓"}
          </span>
          {i}
        </li>
      ))}
    </ul>
  );
}
