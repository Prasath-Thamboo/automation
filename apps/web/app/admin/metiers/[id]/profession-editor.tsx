"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { AdminProfession } from "@tando/api-client";
import {
  publishProfession,
  removeProfession,
  saveDraft,
  setVisibility,
  updateProfession,
  type ActionState,
} from "../../actions";
import { templateContentToForm } from "../../content-format";

const field = "mt-1 w-full rounded-md border border-ink-100 px-3 py-2 text-base";
const area = `${field} font-mono text-sm`;

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-primary-700">Enregistré.</p>;
  return null;
}

export function ProfessionEditor({ profession }: { profession: AdminProfession }) {
  const id = profession.id;
  // Un métier déjà publié mais sans brouillon : on pré-remplit avec le contenu
  // publié pour ne pas repartir d'une fiche vide.
  const v = templateContentToForm(profession.draftContent ?? profession.publishedContent);

  const [detailsState, saveDetails, savingDetails] = useActionState<ActionState, FormData>(
    updateProfession.bind(null, id),
    {},
  );
  const [contentState, saveContent, savingContent] = useActionState<ActionState, FormData>(
    saveDraft.bind(null, id),
    {},
  );
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string>();

  function run(fn: () => Promise<ActionState>, okMsg: string) {
    start(async () => {
      const r = await fn();
      setNotice(r.error ?? okMsg);
    });
  }

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/metiers" className="text-sm text-primary-700">
          ← Tous les métiers
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">{profession.name}</h1>
        <p className="text-sm text-ink-500">
          /{profession.slug} ·{" "}
          {profession.publishedVersion
            ? `v${profession.publishedVersion} publiée`
            : "jamais publié"}
          {profession.hasDraft ? " · brouillon en cours" : ""}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-100 bg-white p-4">
        <button
          type="button"
          disabled={pending || !profession.hasDraft}
          onClick={() => run(() => publishProfession(id), "Brouillon publié.")}
          className="min-h-touch rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Publier le brouillon
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => setVisibility(id, !profession.published), "Visibilité mise à jour.")
          }
          className="min-h-touch rounded-md border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"
        >
          {profession.published ? "Masquer du catalogue" : "Rendre visible"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Supprimer ce métier ? Il disparaîtra du catalogue.")) {
              start(() => removeProfession(id));
            }
          }}
          className="min-h-touch rounded-md px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50"
        >
          Supprimer
        </button>
        {notice ? <span className="text-sm text-ink-700">{notice}</span> : null}
      </div>

      {/* Fiche d'identité */}
      <form action={saveDetails} className="grid gap-4 rounded-lg border border-ink-100 bg-white p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold text-ink-900 sm:col-span-2">Identité</h2>
        <Text name="slug" label="Slug" defaultValue={profession.slug} />
        <Text name="name" label="Nom" defaultValue={profession.name} />
        <Text name="sector" label="Secteur" defaultValue={profession.sector} />
        <Text name="monthlyPriceEur" label="Prix mensuel (€)" type="number" defaultValue={profession.monthlyPriceEur} />
        <Text name="setupPriceEur" label="Mise en service (€)" type="number" defaultValue={profession.setupPriceEur} />
        <Text name="trialDays" label="Essai (jours)" type="number" defaultValue={profession.trialDays} />
        <Text name="benefit" label="Phrase de bénéfice" defaultValue={profession.benefit} full />
        <Text name="needs" label="Besoins (virgules)" defaultValue={profession.needs.join(", ")} full />
        <div className="sm:col-span-2">
          <Feedback state={detailsState} />
        </div>
        <SubmitBtn pending={savingDetails} label="Enregistrer l'identité" />
      </form>

      {/* Contenu de la fiche (brouillon) */}
      <form action={saveContent} className="space-y-4 rounded-lg border border-ink-100 bg-white p-6">
        <h2 className="text-lg font-bold text-ink-900">
          Contenu de la fiche <span className="font-normal text-ink-500">(enregistré en brouillon)</span>
        </h2>
        <Text name="assistantName" label="Prénom de l'assistant" defaultValue={v.assistantName} />
        <Text name="assistantRole" label="Rôle" defaultValue={v.assistantRole} />
        <Area name="intro" label="Phrase d'accroche" defaultValue={v.intro} rows={2} />
        <Area
          name="dayTimeline"
          label="Journée type — une ligne « 7h30 | ce qu'il fait »"
          defaultValue={v.dayTimeline}
          rows={6}
        />
        <Area name="canDo" label="Ce qu'il sait faire — une puce par ligne" defaultValue={v.canDo} rows={7} />
        <Area name="cannotDo" label="Ce qu'il ne fait pas — une puce par ligne" defaultValue={v.cannotDo} rows={4} />
        <Text name="demoIntro" label="Démo — phrase d'intro" defaultValue={v.demoIntro} />
        <Area
          name="demoMessages"
          label="Démo — une ligne « client | texte » ou « assistant | texte »"
          defaultValue={v.demoMessages}
          rows={7}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text name="sliderALabel" label="Curseur A — libellé" defaultValue={v.sliderALabel} />
          <Text name="sliderBLabel" label="Curseur B — libellé" defaultValue={v.sliderBLabel} />
          <Text name="sliderAMin" label="A min" type="number" defaultValue={v.sliderAMin} />
          <Text name="sliderBMin" label="B min" type="number" defaultValue={v.sliderBMin} />
          <Text name="sliderAMax" label="A max" type="number" defaultValue={v.sliderAMax} />
          <Text name="sliderBMax" label="B max" type="number" defaultValue={v.sliderBMax} />
          <Text name="sliderADefault" label="A défaut" type="number" defaultValue={v.sliderADefault} />
          <Text name="sliderBDefault" label="B défaut" type="number" defaultValue={v.sliderBDefault} />
          <Text name="sliderAMinutes" label="A minutes/unité/jour" type="number" defaultValue={v.sliderAMinutes} />
          <Text name="sliderBMinutes" label="B minutes/unité/jour" type="number" defaultValue={v.sliderBMinutes} />
          <Text name="daysPerMonth" label="Jours travaillés / mois" type="number" defaultValue={v.daysPerMonth} />
        </div>
        <Area name="savingsNote" label="Note sous le calcul" defaultValue={v.savingsNote} rows={2} />
        <Area name="included" label="Contrat — ce qui est inclus, une ligne par élément" defaultValue={v.included} rows={5} />
        <Area name="cancellation" label="Contrat — résiliation" defaultValue={v.cancellation} rows={2} />
        <Area
          name="personalization"
          label="Personnalisation « premier jour » — « clé | libellé | type | opt;opt | * »"
          defaultValue={v.personalization}
          rows={4}
        />
        <Feedback state={contentState} />
        <SubmitBtn pending={savingContent} label="Enregistrer le brouillon" />
      </form>
    </div>
  );
}

function Text({
  name,
  label,
  defaultValue,
  type = "text",
  full = false,
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={`text-sm font-semibold text-ink-700 ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className={field} />
    </label>
  );
}

function Area({
  name,
  label,
  defaultValue,
  rows,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <label className="block text-sm font-semibold text-ink-700">
      {label}
      <textarea name={name} defaultValue={defaultValue} rows={rows} className={area} />
    </label>
  );
}

function SubmitBtn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-touch justify-self-start rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}
