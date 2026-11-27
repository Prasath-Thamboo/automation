import Link from "next/link";
import type { HelpRequestItem } from "@velekya/api-client";
import { helpCopy } from "@velekya/copy";
import { helpLink } from "./help-links";

const STATUS_STYLE: Record<HelpRequestItem["status"], string> = {
  repondue: "bg-primary-50 text-primary-700",
  sans_reponse: "bg-ink-100 text-ink-700",
  transmise: "bg-accent-100 text-primary-900",
  traitee: "bg-primary-50 text-primary-700",
};

const frDate = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Questions déjà posées par l'entreprise, avec leur réponse éventuelle. */
export function HelpHistory({ items }: { items: HelpRequestItem[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-base text-ink-500">{helpCopy.historyEmpty}</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => {
        const link = item.answer ? helpLink(item.action) : null;
        return (
          <li key={item.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-base font-semibold text-ink-900">{item.question}</p>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[item.status]}`}>
                {helpCopy.status[item.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-500">{frDate(item.createdAt)}</p>
            {item.answer ? (
              <div className="mt-3 rounded-md bg-paper px-4 py-3">
                {item.status === "traitee" ? (
                  <p className="text-sm font-bold text-primary-700">{helpCopy.teamAnswer}</p>
                ) : null}
                <p className="whitespace-pre-line text-base text-ink-800">{item.answer}</p>
                {link ? (
                  <Link href={link.href} className="mt-2 inline-block text-base font-semibold text-primary-700">
                    {link.label} →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
