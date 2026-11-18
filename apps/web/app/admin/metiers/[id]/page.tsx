import { notFound } from "next/navigation";
import { ApiError } from "@velekya/api-client";
import { sessionApi } from "@/lib/api";
import { ProfessionEditor } from "./profession-editor";
import { WorkflowEditor } from "./workflow-editor";

export const dynamic = "force-dynamic";

export default async function AdminMetierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const api = (await sessionApi()).admin;
    const [profession, workflow] = await Promise.all([
      api.catalog.get(id),
      api.setup.professionWorkflow(id),
    ]);
    return (
      <div className="space-y-10">
        <ProfessionEditor profession={profession} />
        <WorkflowEditor workflow={workflow} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
      notFound();
    }
    throw error;
  }
}
