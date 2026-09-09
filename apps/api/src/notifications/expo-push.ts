/**
 * Client minimal de l'API Expo Push (https://docs.expo.dev/push-notifications/sending-notifications/).
 * On ne dépend pas du SDK `expo-server-sdk` : un `fetch` suffit et évite une
 * dépendance de plus. APNs et FCM sont gérés par Expo côté serveur.
 */

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface SendResult {
  tickets: ExpoPushTicket[];
  /** Jetons qu'Expo signale comme définitivement injoignables (à désactiver). */
  invalidTokens: string[];
}

const CHUNK = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Envoie un lot de messages ; renvoie les tickets et les jetons morts. */
export async function sendExpoPush(
  url: string,
  messages: ExpoPushMessage[],
  accessToken?: string,
): Promise<SendResult> {
  const tickets: ExpoPushTicket[] = [];
  const invalidTokens: string[] = [];

  for (const batch of chunk(messages, CHUNK)) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Expo Push a répondu ${res.status} : ${text.slice(0, 300)}`);
    }

    const payload = (await res.json()) as { data?: ExpoPushTicket[] };
    const data = payload.data ?? [];
    data.forEach((ticket, i) => {
      tickets.push(ticket);
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered" &&
        batch[i]
      ) {
        invalidTokens.push(batch[i]!.to);
      }
    });
  }

  return { tickets, invalidTokens };
}

/** Un jeton Expo valide ressemble à `ExponentPushToken[xxxxxxxx]`. */
export function looksLikeExpoToken(token: string): boolean {
  return /^Ex(ponent|po)PushToken\[[^\]]+\]$/.test(token);
}
