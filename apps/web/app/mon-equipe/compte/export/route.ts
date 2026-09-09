import { NextResponse } from "next/server";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

/** Export RGPD (§9.4) : toutes les données de l'organisation, en JSON. */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Non connecté.", { status: 401 });

  const body = await (await sessionApi()).me.exportData();
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mes-donnees-tando.json"',
      "cache-control": "no-store",
    },
  });
}
