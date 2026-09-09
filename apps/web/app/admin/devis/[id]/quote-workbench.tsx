"use client";

import { useActionState, useTransition, useState } from "react";
import Link from "next/link";
import type { AdminQuote } from "@tando/api-client";
import { updateQuote, sendQuote, type ActionState } from "../actions";

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 });
const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";
const EDITABLE = ["brouillon", "en_relecture"];

export function QuoteWorkbench({ quote }: { quote: AdminQuote }) {
  const editable = EDITABLE.includes(quote.status);
  const [state, save, saving] = useActionState<ActionState, FormData>(
    updateQuote.bind(null, quote.id),
    {},
  );
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string>();
  const jd = quote.content.jobDescription;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/devis" className="text-sm text-primary-700">← Tous les devis</Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">{quote.number}</h1>
        <p className="text-sm text-ink-500">
          {quote.company} · {quote.email} · statut : {quote.status}
          {quote.sentAt ? ` · envoyé le ${new Date(quote.sentAt).toLocaleDateString("fr-FR")}` : ""}
          {quote.acceptedAt
            ? ` · accepté le ${new Date(quote.acceptedAt).toLocaleDateString("fr-FR")} (IP ${quote.acceptanceIp ?? "?"})`
            : ""}
        </p>
      </div>

      <section className="rounded-lg border border-ink-100 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">Total actuel</h2>
        <p className="mt-2 text-base">
          Mise en service <strong>{euro(quote.setupEur)}</strong> · Mensuel{" "}
          <strong>{euro(quote.monthlyEur)}</strong> ({quote.formula})
        </p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1 pr-4">{l.label}</td>
                <td className="py-1 pr-4 text-right">{l.setupEur ? euro(l.setupEur) : "—"}</td>
                <td className="py-1 text-right">{l.monthlyEur ? euro(l.monthlyEur) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-ink-100 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">Fiche de poste (relue par le client)</h2>
        <p className="mt-2 text-sm text-ink-700">{jd.summary}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-ink-700">
          {jd.tasks.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <p className="mt-2 text-sm text-ink-500">Horaires : {jd.hours} · Ton : {jd.tone}</p>
        <p className="mt-1 text-sm text-ink-500">Limites : {jd.limits.join(" ; ")}</p>
      </section>

      <details className="rounded-lg border border-ink-100 bg-white p-5">
        <summary className="cursor-pointer text-lg font-bold text-ink-900">Réponses au questionnaire</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {Object.entries(quote.answers).map(([k, v]) => (
            <div key={k}>
              <dt className="inline font-semibold text-ink-700">{k} : </dt>
              <dd className="inline text-ink-700">{Array.isArray(v) ? v.join(", ") : String(v ?? "")}</dd>
            </div>
          ))}
        </dl>
      </details>

      {editable ? (
        <form action={save} className="space-y-4 rounded-lg border border-primary-600 p-5">
          <h2 className="text-lg font-bold text-ink-900">Ajuster</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink-700">
              Formule
              <select name="formula" defaultValue={quote.formula} className={field}>
                <option value="sur-mesure">Sur mesure</option>
                <option value="sur-mesure-plus">Sur mesure +</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-ink-700">
              Facteur de complexité (0,8 à 2,0)
              <input
                name="complexityFactor"
                type="number"
                step="0.05"
                min="0.8"
                max="2"
                defaultValue={quote.complexityFactor}
                className={field}
              />
            </label>
            <label className="text-sm font-semibold text-ink-700">
              Engagement (mois)
              <input name="engagementMonths" type="number" min="0" defaultValue={quote.engagementMonths} className={field} />
            </label>
            <label className="text-sm font-semibold text-ink-700">
              Délai de mise en service (jours)
              <input name="serviceDelayDays" type="number" min="1" defaultValue={quote.serviceDelayDays} className={field} />
            </label>
          </div>
          <label className="block text-sm font-semibold text-ink-700">
            Commentaire de complexité (obligatoire si facteur ≠ 1)
            <textarea name="complexityNote" defaultValue={quote.complexityNote ?? ""} rows={2} className={field} />
          </label>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-primary-700">Recalculé.</p> : null}
          <button type="submit" disabled={saving} className="min-h-touch rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white disabled:opacity-60">
            {saving ? "…" : "Recalculer le devis"}
          </button>
        </form>
      ) : null}

      <section className="rounded-lg border border-ink-100 bg-white p-5">
        <h2 className="text-lg font-bold text-ink-900">Envoi</h2>
        {editable ? (
          <>
            <p className="mt-1 text-sm text-ink-500">
              Le client reçoit un email avec un lien pour consulter et accepter le devis. Aucun envoi
              automatique.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await sendQuote(quote.id);
                  setNotice(r.error ?? "Devis envoyé au client.");
                })
              }
              className="mt-3 min-h-touch rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white disabled:opacity-60"
            >
              Envoyer au client
            </button>
            {notice ? <p className="mt-2 text-sm text-ink-700">{notice}</p> : null}
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-700">
            Ce devis est parti (statut : {quote.status}). Il ne peut plus être modifié.
          </p>
        )}
      </section>
    </div>
  );
}
