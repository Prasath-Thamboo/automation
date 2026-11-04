import Link from "next/link";
import { redirect } from "next/navigation";
import { subscribeCopy } from "@tando/copy";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import {
  CancelSubscriptionButton,
  DeleteAccountButton,
  ExportButton,
  NameForm,
} from "./account-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte", robots: { index: false } };

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const SUB_STATUS: Record<string, string> = {
  incomplete: "En attente du premier paiement",
  active: "Actif",
  past_due: "Paiement en retard",
  paused: "En pause",
  canceled: "Résilié",
};
const ROLE: Record<string, string> = {
  owner: "Titulaire",
  member: "Membre",
  admin: "Équipe Tando",
};

export default async function ComptePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const acc = await (await sessionApi()).me.account();
  const isOwner = acc.role === "owner" || acc.role === "admin";
  const subActive = acc.subscription != null && acc.subscription.status !== "canceled";

  return (
    <section className="mx-auto max-w-prose px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/mon-equipe"
        className="inline-flex min-h-touch items-center text-base font-semibold text-primary-700"
      >
        ← Mon équipe
      </Link>
      <h1 className="mt-2 text-3xl text-ink-950 sm:text-4xl">Mon compte</h1>

      <div className="card mt-8">
        <h2 className="text-xl text-ink-900">Vos coordonnées</h2>
        <p className="mt-1 text-base text-ink-700">
          {acc.email} · {acc.organizationName} · {ROLE[acc.role] ?? acc.role}
        </p>
        <div className="mt-4">
          <NameForm current={acc.fullName ?? ""} />
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-xl text-ink-900">Votre équipe</h2>
        <ul className="mt-2 space-y-1 text-base text-ink-700">
          {acc.members.map((m) => (
            <li key={m.email}>
              {m.fullName ?? m.email} — {ROLE[m.role] ?? m.role}
            </li>
          ))}
        </ul>
      </div>

      <div className="card mt-6">
        <h2 className="text-xl text-ink-900">Son contrat</h2>
        {acc.subscription ? (
          <p className="mt-1 text-base text-ink-700">
            {SUB_STATUS[acc.subscription.status] ?? acc.subscription.status} ·{" "}
            {euro(acc.subscription.monthlyEur)} / mois
            {acc.subscription.currentPeriodEnd
              ? ` · prochaine échéance le ${new Date(acc.subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}`
              : ""}
            {acc.subscription.trialEndsAt && new Date(acc.subscription.trialEndsAt) > new Date() ? (
              <span className="mt-2 block font-semibold text-primary-700">
                {subscribeCopy.trialUntil(
                  new Date(acc.subscription.trialEndsAt).toLocaleDateString("fr-FR"),
                )}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-base text-ink-700">Aucun contrat pour l&apos;instant.</p>
        )}
        <p className="mt-2 text-base">
          <Link href="/mon-equipe/documents" className="font-semibold text-primary-700 underline">
            Voir mes factures
          </Link>
        </p>
        {isOwner ? (
          <div className="mt-4">
            <CancelSubscriptionButton active={subActive} />
          </div>
        ) : null}
      </div>

      <div className="card mt-6">
        <h2 className="text-xl text-ink-900">Vos données</h2>
        <p className="mt-1 text-base text-ink-700">
          Elles restent en France et ne servent qu&apos;à vous. Vous pouvez tout exporter ou tout
          effacer.
        </p>
        <div className="mt-3">
          <ExportButton />
        </div>
      </div>

      {isOwner ? (
        <>
          <div className="card mt-6 border-danger/30">
            <h2 className="text-xl text-danger">Supprimer mon compte</h2>
            <div className="mt-3">
              <DeleteAccountButton />
            </div>
          </div>
        </>
      ) : null}

      <p className="mt-10 text-base text-ink-700">
        Une question ?{" "}
        <Link href="/contact" className="font-semibold text-primary-700">
          Parler à un humain
        </Link>
      </p>
    </section>
  );
}
