"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface PayState {
  ok?: boolean;
  error?: string;
}

/**
 * Démarre le paiement d'une facture. Fournisseur avec redirection (Stripe) :
 * on redirige vers le paiement. Mode démo (`fake`) : on confirme sur place.
 */
export async function payInvoice(invoiceNumber: string): Promise<PayState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const api = await sessionApi();
  try {
    const checkout = await api.me.startPayment(invoiceNumber);
    if (checkout.checkoutUrl) {
      redirect(checkout.checkoutUrl);
    }
    await api.me.confirmPayment(checkout.paymentRef);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  revalidatePath("/mon-equipe/documents");
  return { ok: true };
}

export interface CardState {
  ok?: boolean;
  message?: string;
  error?: string;
}

/**
 * Lot 22 — enregistre une carte pour le prélèvement automatique. Fournisseur avec
 * redirection (Stripe) : page de paiement sécurisée. Mode démo : confirmé sur place.
 */
export async function saveCard(): Promise<CardState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const api = await sessionApi();
  let checkoutUrl: string | null = null;
  try {
    const setup = await api.me.startCardSetup();
    checkoutUrl = setup.checkoutUrl;
    if (!checkoutUrl) await api.me.confirmCardSetup(setup.setupRef);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  // `redirect` lève une exception de navigation : hors du try.
  if (checkoutUrl) redirect(checkoutUrl);
  revalidatePath("/mon-equipe/documents");
  return { ok: true };
}

/** Lot 22 — retire la carte enregistrée. */
export async function removeCard(): Promise<CardState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  try {
    await (await sessionApi()).me.removeSavedCard();
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  revalidatePath("/mon-equipe/documents");
  return { ok: true };
}
