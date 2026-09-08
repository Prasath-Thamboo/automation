import type { Metadata } from "next";
import { Callout } from "@tando/ui";
import { auth as authCopy } from "@tando/copy";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1>{authCopy.title}</h1>
      {erreur === "lien" ? (
        <Callout tone="warning">{authCopy.error.linkExpired}</Callout>
      ) : null}
      <ConnexionForm />
    </section>
  );
}
