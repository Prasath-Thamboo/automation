import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@tando/api-client";
import { glossary } from "@tando/copy";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import {
  EscalationCard,
  InstructionForm,
  InstructionList,
  PauseControl,
} from "./controls";

export const dynamic = "force-dynamic";

const CHANNEL: Record<string, string> = {
  telephone: "au téléphone",
  whatsapp: "sur WhatsApp",
  email: "par email",
  instagram: "sur Instagram",
  formulaire: "via le formulaire",
  surplace: "sur place",
  autre: "",
};
const STATE: Record<string, string> = {
  en_formation: glossary.states.training,
  au_travail: glossary.states.working,
  en_pause: glossary.states.paused,
};

export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const { id } = await params;

  let a;
  try {
    a = await (await sessionApi()).me.assistant(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  if (a.onboarding !== "termine") {
    redirect(`/mon-equipe/assistants/${id}/premier-jour`);
  }

  const openEscalations = a.escalations.filter((e) => e.status === "ouverte");
  const closedEscalations = a.escalations.filter((e) => e.status === "repondue");

  return (
    <section className="mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-20">
      <Link href="/mon-equipe" className="text-sm text-primary-700">
        ← {glossary.assistant.teamPage}
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">{a.name}</h1>
          <p className="text-base text-ink-700">{a.role}</p>
          <p className="mt-1 text-sm text-ink-500">État : {STATE[a.state] ?? a.state}</p>
        </div>
        <PauseControl id={id} paused={a.state === "en_pause"} />
      </div>

      {/* Son carnet de bord */}
      <h2 className="mt-12 text-xl font-bold text-ink-900">{glossary.artifacts.logbook}</h2>
      <p className="mt-1 text-base text-ink-700">
        Aujourd&apos;hui : {a.todayCount} demande{a.todayCount > 1 ? "s" : ""} · cette semaine :{" "}
        {a.weekCount}.
      </p>
      {a.logbook.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">Rien à afficher pour le moment.</p>
      ) : (
        <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
          {a.logbook.map((entry) => (
            <li key={entry.id} className="p-4">
              <Link
                href={`/mon-equipe/assistants/${id}/conversations/${entry.id}`}
                className="text-base text-ink-900 no-underline hover:text-primary-700"
              >
                {entry.summary || `Un échange ${CHANNEL[entry.channel] ?? ""}`}
              </Link>
              <p className="text-xs text-ink-500">
                {entry.customerLabel} · {CHANNEL[entry.channel] ?? entry.channel} ·{" "}
                {new Date(entry.lastMessageAt).toLocaleString("fr-FR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* À valider */}
      <h2 className="mt-12 text-xl font-bold text-ink-900">{glossary.artifacts.escalations}</h2>
      {openEscalations.length === 0 ? (
        <p className="mt-2 text-base text-ink-700">Rien à valider. Il gère.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {openEscalations.map((e) => (
            <EscalationCard key={e.id} escalation={e} assistantId={id} />
          ))}
        </div>
      )}
      {closedEscalations.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-500">
            Demandes déjà traitées ({closedEscalations.length})
          </summary>
          <div className="mt-3 space-y-3">
            {closedEscalations.map((e) => (
              <EscalationCard key={e.id} escalation={e} assistantId={id} />
            ))}
          </div>
        </details>
      ) : null}

      {/* Le former */}
      <h2 className="mt-12 text-xl font-bold text-ink-900">Le former</h2>
      <p className="mt-1 text-base text-ink-700">
        Ajoutez une consigne en langage courant. Chaque version est conservée.
      </p>
      <div className="mt-4">
        <InstructionForm id={id} />
      </div>
      <div className="mt-4">
        <InstructionList instructions={a.instructions} />
      </div>

      {/* Ses horaires */}
      <h2 className="mt-12 text-xl font-bold text-ink-900">Ses horaires</h2>
      <p className="mt-1 text-base text-ink-700">{a.hours || a.establishment.openingHours || "À définir."}</p>
      <p className="mt-1 text-sm text-ink-500">
        <Link href={`/mon-equipe/assistants/${id}/premier-jour`} className="font-semibold text-primary-700">
          Modifier ses informations
        </Link>
      </p>
    </section>
  );
}
