import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * État de connexion, partagé par toute l'app. `null` tant qu'on ne sait pas
 * encore (au premier rendu), puis `true` / `false`.
 */
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const reachable =
        state.isInternetReachable === null
          ? Boolean(state.isConnected)
          : Boolean(state.isConnected && state.isInternetReachable);
      setOnline(reachable);
    });
    void NetInfo.fetch().then((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return () => unsub();
  }, []);

  return online;
}

/** Une lecture ponctuelle (hors composant). */
export async function isOnlineNow(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected);
}
