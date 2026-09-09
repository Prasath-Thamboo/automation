import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { QuoteWorkbench } from "./quote-workbench";

export const dynamic = "force-dynamic";

export default async function AdminDevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const quote = await (await sessionApi()).admin.quotes.get(id);
    return <QuoteWorkbench quote={quote} />;
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
      notFound();
    }
    throw error;
  }
}
