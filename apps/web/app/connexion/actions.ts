"use server";

import { cookies } from "next/headers";
import { requestMagicLinkSchema } from "@tando/types";
import { ApiError } from "@tando/api-client";
import { auth as authCopy } from "@tando/copy";
import { anonApi } from "@/lib/api";

export interface MagicLinkState {
  status: "idle" | "sent" | "error";
  message?: string;
}

/** Chemin interne où revenir après connexion (ex. finir une souscription). */
const AFTER_LOGIN_COOKIE = "tando_after_login";
function safePath(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "");
  return /^\/[A-Za-z0-9\-/_]*$/.test(s) && !s.startsWith("//") ? s : null;
}

/** Envoie un lien de connexion à l'adresse saisie. */
export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = requestMagicLinkSchema.safeParse({
    email: formData.get("email"),
    channel: "web",
  });

  if (!parsed.success) {
    return { status: "error", message: authCopy.error.invalidEmail };
  }

  const suite = safePath(formData.get("suite"));
  if (suite) {
    (await cookies()).set(AFTER_LOGIN_COOKIE, suite, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
  }

  try {
    await anonApi().auth.requestMagicLink(parsed.data);
    return { status: "sent" };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 422) {
      return { status: "error", message: authCopy.error.invalidEmail };
    }
    return { status: "error", message: authCopy.error.generic };
  }
}
