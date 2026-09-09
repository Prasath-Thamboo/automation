import { NextResponse } from "next/server";
import { ApiError } from "@tando/api-client";
import { sessionApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

/** Renvoie le document HTML imprimable d'une facture, pour le client connecté. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));

  const { number } = await params;
  try {
    const html = await (await sessionApi()).me.invoiceDocument(number);
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    return new NextResponse("Document introuvable.", { status });
  }
}
