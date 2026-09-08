import "server-only";
import { cookies } from "next/headers";
import type { SessionUser } from "@tando/types";
import { sessionApi } from "./api";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  };
}

/** Utilisateur connecté, ou `null`. Ne lève jamais. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  if (!store.get(SESSION_COOKIE)?.value) return null;
  try {
    const api = await sessionApi();
    return await api.auth.me();
  } catch {
    return null;
  }
}
