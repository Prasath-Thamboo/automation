"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionApi } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/constants";

/** Déconnexion : révoque la session côté API puis efface le cookie. */
export async function signOut(): Promise<void> {
  try {
    await (await sessionApi()).auth.signOut();
  } catch {
    // La session est peut-être déjà invalide — on efface quand même le cookie.
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/connexion");
}
