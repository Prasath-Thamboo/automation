import { notFound, redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { PremierJour } from "./premier-jour";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le premier jour", robots: { index: false } };

export default async function PremierJourPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const { id } = await params;

  try {
    const assistant = await (await sessionApi()).me.assistant(id);
    if (assistant.onboarding === "termine") redirect(`/mon-equipe/assistants/${id}`);
    return <PremierJour assistant={assistant} />;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }
}
