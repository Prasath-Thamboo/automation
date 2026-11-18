"use client";

import { useTransition } from "react";
import { Button } from "@velekya/ui";
import { dashboard } from "@velekya/copy";
import { signOut } from "@/app/mon-equipe/actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" loading={pending} onClick={() => start(() => signOut())}>
      {dashboard.signOut}
    </Button>
  );
}
