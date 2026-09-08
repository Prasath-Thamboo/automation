import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Garde rapide pour les zones connectées (`/mon-equipe`, `/admin`) : pas de
 * cookie de session -> retour à la connexion. La vérification réelle (jeton
 * valide, rôle) se fait dans la page / le layout via l'API.
 */
export function middleware(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = new URL("/connexion", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mon-equipe/:path*", "/admin/:path*"],
};
