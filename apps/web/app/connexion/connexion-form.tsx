"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, Callout } from "@tando/ui";
import { auth as authCopy, common } from "@tando/copy";
import { requestMagicLink, type MagicLinkState } from "./actions";

const initial: MagicLinkState = { status: "idle" };

export function ConnexionForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);
  const suite = useSearchParams().get("suite") ?? "";

  if (state.status === "sent") {
    return <Callout tone="success">{authCopy.sent.body}</Callout>;
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="suite" value={suite} />
      <Field
        label={authCopy.emailLabel}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={authCopy.emailPlaceholder}
        error={state.status === "error" ? state.message : undefined}
      />
      <Button type="submit" size="lg" loading={pending}>
        {pending ? authCopy.submitting : authCopy.submit}
      </Button>
      <p style={{ fontSize: 14, color: "var(--tnd-ink-500)", margin: 0 }}>{common.talkToHuman}</p>
    </form>
  );
}
