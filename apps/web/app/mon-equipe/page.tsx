import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Callout } from "@tando/ui";
import { dashboard, glossary } from "@tando/copy";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: dashboard.title };

/**
 * Espace client — Lot 0 : coquille protégée. « Mon équipe » sera remplie au Lot 5
 * (carnet de bord, escalades, formation de l'assistant…).
 */
export default async function MonEquipePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{dashboard.title}</h1>
        <SignOutButton />
      </div>

      <p style={{ color: "var(--tnd-ink-700)", margin: 0 }}>
        Bonjour {user.fullName ?? user.email} — {user.organizationName}.
      </p>

      <Callout title={dashboard.empty.title}>{dashboard.empty.body}</Callout>

      <p style={{ fontSize: 14, color: "var(--tnd-ink-500)", margin: 0 }}>
        {glossary.assistant.plural} apparaîtront ici dès qu&apos;ils auront pris leur poste.
      </p>
    </section>
  );
}
