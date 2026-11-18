import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { sessionApi } from "@/lib/api";
import { ChannelRow, NewChannelForm } from "./channel-editor";

export const dynamic = "force-dynamic";

/**
 * Raccordement des canaux d'un assistant (Lot 12). Formulaire et adresse email
 * sont créés d'office ; SMS / appels / WhatsApp / Instagram après les démarches
 * auprès du fournisseur (achat du numéro Twilio, compte Meta vérifié…).
 */
export default async function AdminChannelsPage({
  params,
}: {
  params: Promise<{ id: string; assistantId: string }>;
}) {
  const { id, assistantId } = await params;
  let data;
  try {
    data = await (await sessionApi()).admin.channels.list(assistantId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
  if (data.assistant.organizationId !== id) notFound();
  const path = `/admin/clients/${id}/canaux/${assistantId}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/clients/${id}`} className="text-sm text-primary-700 no-underline">
          ← Client
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Canaux — {data.assistant.name}</h1>
        <p className="mt-1 text-sm text-ink-500">
          publicId <span className="font-mono">{data.assistant.publicId ?? "—"}</span>
        </p>
      </div>

      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
        {data.channels.map((c) => (
          <ChannelRow key={c.id} channel={c} path={path} />
        ))}
      </ul>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-ink-900">Raccorder un canal</h2>
        <NewChannelForm assistantId={assistantId} path={path} />
        <p className="text-xs text-ink-500">
          Webhooks à configurer chez les fournisseurs : Twilio →{" "}
          <code>/api/v1/channels/twilio/sms</code> et <code>/api/v1/channels/twilio/voice</code> ; Meta
          → <code>/api/v1/channels/meta</code> ; Brevo → <code>/api/v1/channels/email/brevo?token=…</code>.
          Voir DEPLOYMENT.md.
        </p>
      </section>
    </div>
  );
}
