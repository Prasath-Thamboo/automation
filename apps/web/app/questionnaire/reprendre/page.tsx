"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAssessmentToken } from "@/lib/browser-api";

function Resume() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  useEffect(() => {
    if (token) setAssessmentToken(token);
    router.replace("/questionnaire");
  }, [token, router]);

  return <p className="text-ink-500">Reprise en cours…</p>;
}

export default function ReprendrePage() {
  return (
    <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
      <Suspense fallback={null}>
        <Resume />
      </Suspense>
    </div>
  );
}
