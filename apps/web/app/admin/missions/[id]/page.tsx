import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { jobDescriptionContentSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { ChecklistEditor, StatusControls } from "./mission-workbench";

export const dynamic = "force-dynamic";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-ink-700">{title}</div>
      <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let mission;
  try {
    mission = await (await sessionApi()).admin.missions.get(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const job = jobDescriptionContentSchema.safeParse(mission.jobDescription);
  const answers = Object.entries(mission.answers);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/missions" className="text-sm text-primary-700 no-underline">
          ← Missions
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Mission {mission.quoteNumber}</h1>
        <p className="mt-1 text-base text-ink-500">
          {mission.organizationName}
          {" · "}
          <Link href={`/admin/devis/${mission.quoteId}`} className="text-primary-700 no-underline">
            voir le devis
          </Link>
          {mission.assistantId ? " · employé virtuel créé" : " · pas encore d'employé virtuel"}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Avancement</h2>
        <StatusControls mission={mission} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Check-list de mise en service</h2>
        <ChecklistEditor missionId={mission.id} initial={mission.checklist} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Fiche de poste</h2>
        {job.success ? (
          <div className="space-y-3 rounded-lg border border-ink-100 p-4">
            <p className="text-sm text-ink-800">{job.data.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <List title="Tâches" items={job.data.tasks} />
              <List title="Canaux" items={job.data.channels} />
              <List title="Limites" items={job.data.limits} />
              <List title="Outils" items={job.data.tools} />
              <List title="Hors périmètre" items={job.data.outOfScope} />
            </div>
            <p className="text-sm text-ink-600">
              Horaires : {job.data.hours} · Ton : {job.data.tone}
            </p>
          </div>
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-ink-100 bg-ink-50 p-4 text-xs">
            {JSON.stringify(mission.jobDescription, null, 2)}
          </pre>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink-900">Réponses au questionnaire</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {answers.map(([key, value]) => (
            <div key={key} className="rounded-md border border-ink-100 p-2">
              <dt className="font-semibold text-ink-700">{key}</dt>
              <dd className="text-ink-700">
                {Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
              </dd>
            </div>
          ))}
          {answers.length === 0 ? <p className="text-ink-500">Aucune réponse enregistrée.</p> : null}
        </dl>
      </section>
    </div>
  );
}
