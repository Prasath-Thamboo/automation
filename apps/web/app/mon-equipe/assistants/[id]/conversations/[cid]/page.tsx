import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const CHANNEL: Record<string, string> = {
  telephone: "Au téléphone",
  whatsapp: "Sur WhatsApp",
  email: "Par email",
  instagram: "Sur Instagram",
  formulaire: "Via le formulaire",
  surplace: "Sur place",
  autre: "Échange",
};
const AUTHOR: Record<string, string> = { client: "Client", assistant: "Assistant", patron: "Vous" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const { id, cid } = await params;

  let conv;
  try {
    conv = await (await sessionApi()).me.conversation(id, cid);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return (
    <section className="mx-auto max-w-prose px-4 py-14 sm:px-6 sm:py-20">
      <Link href={`/mon-equipe/assistants/${id}`} className="text-sm text-primary-700">
        ← Son carnet de bord
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">
        {CHANNEL[conv.channel] ?? "Échange"} — {conv.customerLabel}
      </h1>

      <ul className="mt-6 space-y-3">
        {conv.messages.map((m, i) => (
          <li
            key={i}
            className={
              m.author === "client"
                ? "max-w-[85%] rounded-lg rounded-bl-sm bg-ink-100 px-4 py-2"
                : "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary-50 px-4 py-2"
            }
          >
            <span className="mb-0.5 block text-xs font-semibold text-ink-500">
              {AUTHOR[m.author] ?? m.author} · {new Date(m.at).toLocaleTimeString("fr-FR")}
            </span>
            <span className="text-base text-ink-900">{m.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
