import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { publicForm } from "@tando/copy";
import { anonApi } from "@/lib/api";
import { FormChat } from "./form-chat";

export const metadata: Metadata = { title: "Écrivez-nous", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Formulaire public du patron (Lot 12). Affichable seul ou dans son site
 * (iframe) : pas d'en-tête Tando, en-têtes de cadrage assouplis pour cette
 * route uniquement (`next.config.ts`).
 */
export default async function FormulairePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let info;
  try {
    info = await anonApi().form.info(publicId);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold text-ink-900">{publicForm.title(info.establishment)}</h1>
      <p className="mt-2 text-base text-ink-700">{info.open ? publicForm.intro : publicForm.closed}</p>
      <FormChat publicId={publicId} establishment={info.establishment} />
      <p className="mt-6 text-sm text-ink-500">{publicForm.privacy}</p>
    </section>
  );
}
