import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { glossary } from "@tando/copy";
import type { AssistantCard } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Mon équipe", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATE_LABEL: Record<AssistantCard["state"], string> = {
  en_formation: glossary.states.training,
  au_travail: glossary.states.working,
  en_pause: glossary.states.paused,
};
const STATE_STYLE: Record<AssistantCard["state"], string> = {
  en_formation: "bg-accent-100 text-accent-600",
  au_travail: "bg-primary-50 text-primary-700",
  en_pause: "bg-ink-100 text-ink-700",
};

export default async function MonEquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const { assistants } = await (await sessionApi()).me.team();

  return (
    <section className="mx-auto flex max-w-content flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-ink-900">{glossary.assistant.teamPage}</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/mon-equipe/documents" className="font-semibold text-primary-700 no-underline">
            Mes documents
          </Link>
          <Link href="/mon-equipe/compte" className="font-semibold text-primary-700 no-underline">
            Mon compte
          </Link>
          <SignOutButton />
        </div>
      </div>

      <p className="text-base text-ink-700">
        Bonjour {user.fullName ?? user.email} — {user.organizationName}.
      </p>

      {assistants.length === 0 ? (
        <div className="rounded-lg border border-ink-100 bg-white p-6">
          <p className="text-lg font-semibold text-ink-900">Votre équipe est encore vide.</p>
          <p className="mt-2 text-base text-ink-700">
            Choisissez un employé déjà formé à votre métier, ou décrivez votre besoin sur mesure.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/employes-virtuels"
              className="inline-flex min-h-touch items-center rounded-md bg-primary-600 px-5 py-2 text-base font-semibold text-white no-underline"
            >
              Voir les employés disponibles
            </Link>
            <Link
              href="/questionnaire"
              className="inline-flex min-h-touch items-center rounded-md border border-primary-600 px-5 py-2 text-base font-semibold text-primary-700 no-underline"
            >
              Décrire mon besoin
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {assistants.map((a) => (
            <li key={a.id}>
              <Link
                href={
                  a.onboarding === "termine"
                    ? `/mon-equipe/assistants/${a.id}`
                    : `/mon-equipe/assistants/${a.id}/premier-jour`
                }
                className="flex h-full flex-col rounded-lg border border-ink-100 bg-white p-5 no-underline transition-colors hover:border-primary-600"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-ink-900">{a.name}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_STYLE[a.state]}`}>
                    {STATE_LABEL[a.state]}
                  </span>
                </div>
                <span className="mt-1 text-base text-ink-700">{a.role}</span>
                {a.onboarding !== "termine" ? (
                  <span className="mt-3 text-sm font-semibold text-accent-600">
                    Terminer sa mise en service →
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-ink-500">
        Une question ?{" "}
        <Link href="/contact" className="font-semibold text-primary-700">
          {glossary.actions.talkToHuman}
        </Link>
      </p>
    </section>
  );
}
