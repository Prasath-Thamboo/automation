import * as SecureStore from "expo-secure-store";

const KEY = "tando.session";

/** Jeton de session courant, ou `null`. */
export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
