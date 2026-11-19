import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { buildCsp, newNonce, originOf } from "@/lib/csp";

const PROTECTED = /^\/(mon-equipe|admin)(\/|$)/;
const API_ORIGIN = originOf(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333");

/**
 * 1. Garde rapide des zones connectées (`/mon-equipe`, `/admin`) : pas de
 *    cookie de session -> retour à la connexion. La vérification réelle (jeton
 *    valide, rôle) se fait dans la page / le layout via l'API.
 * 2. CSP à nonce sur toutes les pages (Lot 18, voir `lib/csp.ts`).
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (PROTECTED.test(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const csp = buildCsp({
    nonce: newNonce(),
    apiOrigin: API_ORIGIN,
    dev: process.env.NODE_ENV !== "production",
    embeddable: pathname.startsWith("/formulaire/"),
  });

  // Next lit le nonce dans l'en-tête de la requête pour ses propres scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Pages seulement : ni fichiers statiques, ni images optimisées.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
