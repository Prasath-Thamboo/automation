"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
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
