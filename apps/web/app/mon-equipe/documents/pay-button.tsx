"use client";

import { useTransition, useState } from "react";
import { payInvoice } from "./actions";

export function PayButton({ invoiceNumber, amountLabel }: { invoiceNumber: string; amountLabel: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await payInvoice(invoiceNumber);
            setError(r.error);
          })
        }
        className="min-h-touch rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Paiement…" : `Payer ${amountLabel}`}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
