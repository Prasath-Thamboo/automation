import "server-only";
import { cookies } from "next/headers";
import { createApiClient } from "@tando/api-client";
import { SESSION_COOKIE } from "./constants";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
}

/** Client sans session — lien magique, vérification. */
export function anonApi() {
  return createApiClient({ baseUrl: baseUrl() });
}

/**
 * Client authentifié, côté serveur uniquement. Lit le jeton dans le cookie
 * httpOnly propre à l'origine du site et l'envoie en `Authorization: Bearer`.
 */
export async function sessionApi() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return createApiClient({ baseUrl: baseUrl(), getToken: () => token });
}
