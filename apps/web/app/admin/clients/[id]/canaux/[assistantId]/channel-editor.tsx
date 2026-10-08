"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdminChannel } from "@tando/api-client";
import {
  createChannel,
  deleteChannel,
  updateChannel,
  type ChannelActionState,
} from "./actions";

export const KIND_LABEL: Record<string, string> = {
  formulaire: "Formulaire web",
  email: "Email (Brevo inbound)",
  sms: "SMS (Twilio)",
  telephone: "Appels (Twilio)",
  whatsapp: "WhatsApp (Meta Cloud API)",
  instagram: "Instagram (Meta)",
};

const ADDRESS_HINT: Record<string, string> = {
  email: "adresse sur le domaine de réception",
  sms: "numéro Twilio, ex. +33 1 23 45 67 89",
  telephone: "numéro Twilio (souvent le même que pour les SMS)",
  whatsapp: "phone_number_id (chiffres)",
  instagram: "id du compte professionnel Instagram (chiffres)",
};

const input = "rounded-md border border-ink-100 px-2 py-1 text-sm";

function Feedback({ state }: { state: ChannelActionState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-primary-700">{state.ok}</p>;
  return null;
}

export function ChannelRow({ channel, path }: { channel: AdminChannel; path: string }) {
  const [state, action, pending] = useActionState<ChannelActionState, FormData>(
    updateChannel.bind(null, path, channel.id),
    {},
  );
  const [removing, startRemove] = useTransition();
  const [removeState, setRemoveState] = useState<ChannelActionState>({});
  const meta = channel.kind === "whatsapp" || channel.kind === "instagram";

  return (
    <li className="space-y-2 p-4">
      <p className="text-sm">
        <span className="font-semibold text-ink-900">{KIND_LABEL[channel.kind] ?? channel.kind}</span>{" "}
        <span className="font-mono text-ink-700">{channel.address}</span>
        {meta ? (
          <span className="ml-2 text-xs text-ink-500">
            {channel.hasSecret ? "jeton enregistré" : "aucun jeton"}
          </span>
        ) : null}
      </p>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-500">
          Statut
          <select name="status" defaultValue={channel.status} className={`mt-0.5 block ${input}`}>
            <option value="en_attente">En attente</option>
            <option value="actif">Actif</option>
            <option value="desactive">Désactivé</option>
          </select>
        </label>
        {channel.kind !== "formulaire" ? (
          <label className="text-xs text-ink-500">
            Affiché au client
            <input name="display" defaultValue={channel.display} className={`mt-0.5 block ${input}`} />
          </label>
        ) : null}
        {channel.kind === "telephone" ? (
          <label className="text-xs text-ink-500">
            Renvoi vers (facultatif)
            <input
              name="forwardTo"
              defaultValue={channel.forwardTo ?? ""}
              placeholder="+336…"
              className={`mt-0.5 block ${input}`}
            />
          </label>
        ) : null}
        {meta ? (
          <label className="text-xs text-ink-500">
            Nouveau jeton d&apos;accès
            <input name="accessToken" type="password" autoComplete="off" className={`mt-0.5 block ${input}`} />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Enregistrer
        </button>
        {channel.kind !== "formulaire" ? (
          <button
            type="button"
            disabled={removing}
            className="rounded-md border border-ink-100 px-3 py-1.5 text-sm text-red-700"
            onClick={() =>
              startRemove(async () => setRemoveState(await deleteChannel(path, channel.id)))
            }
          >
            Supprimer
          </button>
        ) : null}
      </form>
      <Feedback state={state} />
      <Feedback state={removeState} />
    </li>
  );
}

export function NewChannelForm({ assistantId, path }: { assistantId: string; path: string }) {
  const [state, action, pending] = useActionState<ChannelActionState, FormData>(
    createChannel.bind(null, path, assistantId),
    {},
  );
  const [kind, setKind] = useState("sms");
  const meta = kind === "whatsapp" || kind === "instagram";

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-ink-100 p-4">
      <label className="text-xs text-ink-500">
        Canal
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={`mt-0.5 block ${input}`}
        >
          {["sms", "telephone", "whatsapp", "instagram", "email"].map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-ink-500">
        Identifiant ({ADDRESS_HINT[kind]})
        <input name="address" required className={`mt-0.5 block min-w-[16rem] ${input}`} />
      </label>
      <label className="text-xs text-ink-500">
        Affiché au client
        <input
          name="display"
          placeholder={meta ? "ex. 06 12 34 56 78 / @garage.dupont" : "auto"}
          className={`mt-0.5 block ${input}`}
        />
      </label>
      {kind === "telephone" ? (
        <label className="text-xs text-ink-500">
          Renvoi vers (facultatif)
          <input name="forwardTo" placeholder="+336…" className={`mt-0.5 block ${input}`} />
        </label>
      ) : null}
      {meta ? (
        <label className="text-xs text-ink-500">
          Jeton d&apos;accès
          <input name="accessToken" type="password" autoComplete="off" className={`mt-0.5 block ${input}`} />
        </label>
      ) : null}
      <label className="text-xs text-ink-500">
        Statut
        <select name="status" defaultValue="actif" className={`mt-0.5 block ${input}`}>
          <option value="actif">Actif</option>
          <option value="en_attente">En attente</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        Raccorder
      </button>
      <div className="w-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}
