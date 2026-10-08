"use client";

import { useState } from "react";
import Link from "next/link";
import type { AssistantChannels } from "@tando/api-client";
import { channelLabels, channelsCopy } from "@tando/copy";

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="min-h-11 shrink-0 rounded-md border border-ink-100 px-3 py-2 text-sm font-semibold text-primary-700"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* presse-papiers indisponible : la valeur reste sélectionnable */
        }
      }}
    >
      {done ? channelsCopy.copied : channelsCopy.copy}
    </button>
  );
}

/** « Comment vos clients le joignent » : coordonnées à communiquer + code du formulaire. */
export function ChannelsCard({ channels }: { channels: AssistantChannels }) {
  const listed = channels.channels.filter((c) => c.kind !== "formulaire");
  const hasOptional = listed.some((c) => c.kind !== "email");

  return (
    <>
      <h2 className="mt-12 text-xl font-bold text-ink-900">{channelsCopy.title}</h2>
      <p className="mt-1 text-base text-ink-700">{channelsCopy.intro}</p>

      <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-100 bg-white">
        {listed.map((c) => (
          <li key={`${c.kind}-${c.display}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm text-ink-500">{channelLabels[c.kind]}</p>
              {c.status === "actif" ? (
                <p className="break-all text-base font-semibold text-ink-900">{c.display}</p>
              ) : (
                <p className="text-base text-ink-700">{channelsCopy.pending}</p>
              )}
            </div>
            {c.status === "actif" ? <CopyButton value={c.display} /> : null}
          </li>
        ))}
        <li className="p-4">
          <p className="text-sm text-ink-500">{channelLabels.formulaire}</p>
          <p className="mt-1 text-base text-ink-700">{channelsCopy.formIntro}</p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <code className="block min-w-0 flex-1 break-all rounded-md bg-ink-50 p-3 text-sm text-ink-800">
              {channels.formSnippet}
            </code>
            <CopyButton value={channels.formSnippet} />
          </div>
          <a
            href={channels.formUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-primary-700"
          >
            {channelsCopy.formOpen}
          </a>
        </li>
      </ul>

      {hasOptional ? null : (
        <div className="mt-4 rounded-lg bg-primary-50 p-4">
          <p className="text-base font-semibold text-ink-900">{channelsCopy.askMore.title}</p>
          <p className="mt-1 text-base text-ink-700">{channelsCopy.askMore.body}</p>
          <Link href="/contact" className="mt-2 inline-block text-sm font-semibold text-primary-700">
            {channelsCopy.askMore.cta}
          </Link>
        </div>
      )}
    </>
  );
}
