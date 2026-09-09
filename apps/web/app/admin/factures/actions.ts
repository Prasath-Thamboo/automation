"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { issueCreditNoteSchema } from "@tando/types";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export interface CreditState {
  ok?: string;
  error?: string;
}

export async function issueCreditNote(
  invoiceId: string,
  _prev: CreditState,
  form: FormData,
): Promise<CreditState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const rawAmount = String(form.get("amountEur") ?? "").trim();
  const parsed = issueCreditNoteSchema.safeParse({
    reason: form.get("reason"),
    amountEur: rawAmount ? Number(rawAmount) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    const cn = await (await sessionApi()).admin.billing.creditNote(invoiceId, parsed.data);
    revalidatePath("/admin/factures");
    return { ok: `Avoir ${cn.number} émis.` };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "L'opération a échoué." };
  }
}
