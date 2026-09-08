"use server";

import { requestMagicLinkSchema } from "@tando/types";
import { ApiError } from "@tando/api-client";
import { auth as authCopy } from "@tando/copy";
import { anonApi } from "@/lib/api";

export interface MagicLinkState {
  status: "idle" | "sent" | "error";
  message?: string;
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
