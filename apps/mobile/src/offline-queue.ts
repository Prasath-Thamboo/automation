import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { readJson, writeJson } from "./store";
import { isOnlineNow } from "./net";

/**
 * File d'actions hors ligne (§6bis). Une action faite sans réseau est mise en
 * file puis rejouée, dans l'ordre, à la reconnexion. On ne met en file que des
 * actions idempotentes ou sans effet de bord grave si rejouées.
 */

export type QueuedActionInput =
  | { kind: "answerEscalation"; escalationId: string; answer: string }
  | { kind: "pauseAssistant"; assistantId: string }
  | { kind: "resumeAssistant"; assistantId: string }
  | { kind: "addInstruction"; assistantId: string; text: string };

export type QueuedAction = QueuedActionInput & { id: string };

const KEY = "tando:queue:v1";
const listeners = new Set<(count: number) => void>();

async function load(): Promise<QueuedAction[]> {
  return (await readJson<QueuedAction[]>(KEY)) ?? [];
}

async function save(list: QueuedAction[]): Promise<void> {
  await writeJson(KEY, list);
  listeners.forEach((fn) => fn(list.length));
}

export async function queueAction(action: QueuedActionInput): Promise<void> {
  const list = await load();
  list.push({ ...action, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  await save(list);
}

export async function pendingCount(): Promise<number> {
  return (await load()).length;
}

async function run(action: QueuedAction): Promise<void> {
  switch (action.kind) {
    case "answerEscalation":
      await api.me.answerEscalation(action.escalationId, { answer: action.answer });
      return;
    case "pauseAssistant":
      await api.me.pauseAssistant(action.assistantId);
      return;
    case "resumeAssistant":
      await api.me.resumeAssistant(action.assistantId);
      return;
    case "addInstruction":
      await api.me.addInstruction(action.assistantId, { text: action.text });
      return;
  }
}

let flushing = false;

/** Rejoue la file tant que ça passe. S'arrête au premier échec (réseau, 5xx). */
export async function flushQueue(): Promise<number> {
  if (flushing) return pendingCount();
  flushing = true;
  try {
    let list = await load();
    while (list.length > 0) {
      const [next, ...rest] = list;
      if (!next) break;
      try {
        await run(next);
      } catch {
        break; // on réessaiera plus tard, sans perdre l'ordre
      }
      list = rest;
      await save(list);
    }
    return list.length;
  } finally {
    flushing = false;
  }
}

/** Compteur d'actions en attente + déclencheur d'envoi. */
export function usePendingActions(): { count: number; flush: () => void } {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    void pendingCount().then((n) => alive && setCount(n));
    const fn = (n: number) => alive && setCount(n);
    listeners.add(fn);
    return () => {
      alive = false;
      listeners.delete(fn);
    };
  }, []);

  const flush = useCallback(() => {
    void isOnlineNow().then((online) => {
      if (online) void flushQueue();
    });
  }, []);

  return { count, flush };
}
