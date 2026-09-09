import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { api } from "./api";
import { readJson, writeJson } from "./store";

/**
 * Notifications push (§6bis). L'app enregistre son jeton Expo côté API ; à
 * l'ouverture d'une notification, elle route vers le bon écran via `data.screen`.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const LAST_TOKEN_KEY = "tando:pushToken";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Votre employé virtuel",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
  });
}

/** Demande l'autorisation si besoin. Renvoie `true` si les notifications sont permises. */
export async function requestPushPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Enregistre (ou rafraîchit) le jeton push de cet appareil côté API. À appeler
 * après connexion, sans forcer la demande d'autorisation si elle a été refusée.
 */
export async function syncPushToken(): Promise<void> {
  if (!Device.isDevice) return; // pas de push sur simulateur
  const granted = await requestPushPermission();
  if (!granted) return;

  await ensureAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = res.data;
  } catch {
    return; // pas de connectivité FCM/APNs : on réessaiera au prochain lancement
  }

  const last = await readJson<string>(LAST_TOKEN_KEY);
  try {
    await api.me.registerPushToken({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceName: Device.deviceName ?? undefined,
    });
    if (last !== token) await writeJson(LAST_TOKEN_KEY, token);
  } catch {
    // L'API est injoignable : le prochain lancement retentera.
  }
}

/** Retire ce jeton côté API (déconnexion). */
export async function dropPushToken(): Promise<void> {
  const last = await readJson<string>(LAST_TOKEN_KEY);
  if (!last) return;
  try {
    await api.me.removePushToken(last);
  } catch {
    /* on oublie quand même localement */
  }
}

/** Route vers l'écran cible d'une notification (`data.screen` + `data.id`). */
function routeFromData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined,
): void {
  const screen = typeof data?.screen === "string" ? data.screen : "";
  const id = typeof data?.id === "string" ? data.id : "";
  if (screen === "escalation" && id) {
    router.push({ pathname: "/(app)/valider/[id]", params: { id } });
  } else if (screen === "escalation") {
    router.push("/(app)/valider");
  } else if (screen === "documents") {
    router.push("/(app)/reglages");
  } else if (screen === "today") {
    router.push("/(app)/aujourdhui");
  }
}

/**
 * Branche l'écoute des notifications : ouverture depuis le tiroir système et
 * réception app au premier plan. À monter une fois, dans la zone authentifiée.
 */
export function useNotificationRouting(): void {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const key = response.notification.request.identifier;
      if (handled.current === key) return;
      handled.current = key;
      routeFromData(router, response.notification.request.content.data as Record<string, unknown>);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(router, response.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [router]);
}
