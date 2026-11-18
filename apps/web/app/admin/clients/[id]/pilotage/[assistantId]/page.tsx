import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { sessionApi } from "@/lib/api";
import { NewSwitchForm, SwitchRow, WorkflowForm } from "./setup-editor";

export const dynamic = "force-dynamic";

/**
 * Pilotage d'un employé (Lot 14) : l'équipe Velekya branche le flux n8n construit
 * pour ce client et déclare les boutons qu'il pourra actionner (web + mobile).
 * Contrat du flux : docs/n8n/README.md.
 */
export default async function AdminSetupPage({
  params,
}: {
  params: Promise<{ id: string; assistantId: string }>;
}) {
  const { id, assistantId } = await params;
  let data;
  try {
    data = await (await sessionApi()).admin.setup.get(assistantId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
  if (data.assistant.organizationId !== id) notFound();
  const path = `/admin/clients/${id}/pilotage/${assistantId}`;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/clients/${id}`} className="text-sm text-primary-700 no-underline">
          ← Client
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Pilotage — {data.assistant.name}</h1>
        <p className="mt-1 text-sm text-ink-500">
          assistantId <span className="font-mono">{data.assistant.id}</span> · état{" "}
          {data.assistant.state}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Flux n8n</h2>
        <p className="text-sm text-ink-700">
          {data.workflowUrl
            ? "Branché : chaque message reçu passe par ce flux (si ASSISTANT_RUNTIME=n8n)."
            : "Pas encore branché : l'employé répond avec le moteur à règles."}
        </p>
        <WorkflowForm assistantId={assistantId} path={path} workflowUrl={data.workflowUrl} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Boutons du client</h2>
        <p className="text-sm text-ink-700">
          Le client les voit dans « Ce qu&apos;il fait pour vous » et les active ou les coupe. Le
          flux lit leur état dans <code>switches.&lt;clé&gt;</code>. Libellés en langage client,
          sans jargon.
        </p>
        {data.switches.length > 0 ? (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
            {data.switches.map((s) => (
              <SwitchRow key={s.id} sw={s} path={path} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">Aucun bouton pour l&apos;instant.</p>
        )}
        <NewSwitchForm assistantId={assistantId} path={path} />
      </section>

      <section className="space-y-1 text-xs text-ink-500">
        <h2 className="text-sm font-semibold text-ink-900">Flux planifiés</h2>
        <p>
          En-tête <code>X-Velekya-Token</code> (= <code>N8N_TOKEN</code>) :{" "}
          <code>GET /api/v1/n8n/assistants/{data.assistant.id}/state</code> avant d&apos;agir
          (pause, boutons), puis <code>POST …/activity</code> pour le carnet de bord ou{" "}
          <code>POST …/escalations</code> pour transmettre au client.
        </p>
      </section>
    </div>
  );
}
