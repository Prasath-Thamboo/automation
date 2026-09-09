import { NextResponse, type NextRequest } from "next/server";
import { verifyMagicLinkSchema } from "@tando/types";
import { anonApi } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/constants";
import { sessionCookieOptions } from "@/lib/session";

/**
 * Cible du lien magique web. Vérifie le jeton auprès de l'API, pose le cookie de
 * session (httpOnly, origine du site) et redirige vers l'espace client.
 * En cas d'échec : retour à la page de connexion avec un message.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const parsed = verifyMagicLinkSchema.safeParse({ token });

  const back = NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
  if (!parsed.success) return back;

  try {
    const result = await anonApi().auth.verify(parsed.data);
    if (!result.token) return back;

    const suite = request.cookies.get("tando_after_login")?.value;
    const target =
      suite && /^\/[A-Za-z0-9\-/_]*$/.test(suite) && !suite.startsWith("//") ? suite : "/mon-equipe";

    const response = NextResponse.redirect(new URL(target, request.url));
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
    response.cookies.delete("tando_after_login");
    return response;
  } catch {
    return back;
  }
}
