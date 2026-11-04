import type { Metadata } from "next";
import { Callout } from "@tando/ui";
import { auth as authCopy } from "@tando/copy";
import { Lock } from "@/components/icons";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <div className="bg-glow">
      <section className="mx-auto max-w-lg px-4 py-14 sm:py-24">
        <div className="rounded-xl border border-ink-100 bg-white p-6 shadow-lift sm:p-10">
          <span className="grid h-14 w-14 place-items-center rounded-md bg-primary-100 text-primary-700">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="mt-6 text-3xl text-ink-950">{authCopy.title}</h1>
          <div className="mt-6 flex flex-col gap-5">
            {erreur === "lien" ? (
              <Callout tone="warning">{authCopy.error.linkExpired}</Callout>
            ) : null}
            <ConnexionForm />
          </div>
        </div>
      </section>
    </div>
  );
}
