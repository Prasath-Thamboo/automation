import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { glossary } from "@velekya/copy";
import type { AssistantCard } from "@velekya/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { Cta } from "@/components/cta";
import { ArrowRight } from "@/components/icons";

export const metadata: Metadata = { title: "Mon équipe", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATE_LABEL: Record<AssistantCard["state"], string> = {
  en_formation: glossary.states.training,
  au_travail: glossary.states.working,
  en_pause: glossary.states.paused,
};
const STATE_STYLE: Record<AssistantCard["state"], string> = {
  en_formation: "bg-accent-100 text-primary-900",
  au_travail: "bg-primary-50 text-primary-700",
  en_pause: "bg-ink-100 text-ink-700",
};
const STATE_DOT: Record<AssistantCard["state"], string> = {
  en_formation: "bg-accent-500",
  au_travail: "bg-primary-500",
  en_pause: "bg-ink-400",
};

export default async function MonEquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const { assistants } = await (await sessionApi()).me.team();

  return (
    <section className="mx-auto flex max-w-content flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-lg text-ink-700">
            Bonjour {user.fullName ?? user.email} — {user.organizationName}.
          </p>
          <h1 className="mt-1 text-3xl text-ink-950 sm:text-4xl">{glossary.assistant.teamPage}</h1>
        </div>
        <SignOutButton />
      </div>

      {assistants.length === 0 ? (
        <div className="card sm:p-10">
          <p className="font-heading text-2xl font-semibold text-ink-900">Votre équipe est encore vide.</p>
          <p className="mt-3 max-w-2xl text-base text-ink-700">
            Choisissez un employé déjà formé à votre métier, ou décrivez votre besoin sur mesure.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Cta href="/employes-virtuels" arrow>
              Voir les employés disponibles
            </Cta>
            <Cta href="/questionnaire" variant="secondary">
              Décrire mon besoin
            </Cta>
          </div>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assistants.map((a) => (
            <li key={a.id}>
              <Link
                href={
                  a.onboarding === "termine"
                    ? `/mon-equipe/assistants/${a.id}`
                    : `/mon-equipe/assistants/${a.id}/premier-jour`
                }
                className="card-link group flex h-full flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 font-heading text-2xl font-semibold text-white shadow-glow"
                  >
                    {a.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${STATE_STYLE[a.state]}`}
                  >
                    <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${STATE_DOT[a.state]}`} />
                    {STATE_LABEL[a.state]}
                  </span>
                </div>
                <span className="mt-5 font-heading text-2xl font-semibold text-ink-900">{a.name}</span>
                <span className="mt-1 flex-1 text-base text-ink-700">{a.role}</span>
                {a.onboarding !== "termine" ? (
                  <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-accent-50 px-4 py-3 text-base font-bold text-primary-900">
                    Terminer sa mise en service
                    <ArrowRight className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="mt-5 inline-flex items-center gap-2 text-base font-bold text-primary-700">
                    Voir sa fiche
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-base text-ink-700">
        Une question ?{" "}
        <Link href="/mon-equipe/aide" className="font-semibold text-primary-700 underline">
          Posez-la ici
        </Link>
      </p>
    </section>
  );
}
