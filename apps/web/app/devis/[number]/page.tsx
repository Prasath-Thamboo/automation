import type { Metadata } from "next";
import Link from "next/link";
import { ApiError } from "@tando/api-client";
import { anonApi } from "@/lib/api";
import { QuotePublicView } from "@/components/quote/quote-public-view";

export const metadata: Metadata = {
  title: "Votre devis",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DevisPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { number } = await params;
  const { token } = await searchParams;

  if (!token) return <Invalid />;

  try {
    const quote = await anonApi().quotes.view(number, token);
    return <QuotePublicView quote={quote} number={number} token={token} />;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return <Invalid />;
    throw error;
  }
}

function Invalid() {
  return (
    <div className="mx-auto max-w-prose px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900">Ce lien n&apos;est plus valide</h1>
      <p className="mt-4 text-base text-ink-700">
        Le lien de votre devis a peut-être expiré. Écrivez-nous à bonjour@tando.fr et on vous en
        renvoie un.
      </p>
      <Link href="/" className="mt-6 inline-block font-semibold text-primary-700">
        Revenir à l&apos;accueil
      </Link>
    </div>
  );
}
