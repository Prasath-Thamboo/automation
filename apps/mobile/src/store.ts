import AsyncStorage from "@react-native-async-storage/async-storage";

/** Petit coffre clé/valeur JSON au-dessus d'AsyncStorage, tolérant aux erreurs. */

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Le cache est un confort : un échec d'écriture n'est jamais bloquant.
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Cache d'écran : la dernière réponse reçue, relue hors connexion. */
export const cacheKey = (name: string) => `tando:cache:${name}`;
