import { notFound } from "next/navigation";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { ProfessionEditor } from "./profession-editor";

export const dynamic = "force-dynamic";

export default async function AdminMetierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const profession = await (await sessionApi()).admin.catalog.get(id);
    return <ProfessionEditor profession={profession} />;
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
      notFound();
    }
    throw error;
  }
}
