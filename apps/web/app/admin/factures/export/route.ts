import { NextResponse, type NextRequest } from "next/server";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

/** Télécharge l'export comptable (CSV ou FEC) pour le personnel Tando. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return new NextResponse("Accès refusé.", { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") === "fec" ? "fec" : "csv";
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;

  const body = await (await sessionApi()).admin.billing.export({ from, to, format });
  const filename = format === "csv" ? "export-comptable.csv" : "FEC.txt";

  return new NextResponse(body, {
    headers: {
      "content-type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
