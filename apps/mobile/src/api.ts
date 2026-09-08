import Constants from "expo-constants";
import { createApiClient } from "@tando/api-client";
import { getSessionToken } from "./session";

function baseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    "http://localhost:3333"
  );
}

/**
 * Client API mobile. Le jeton de session vient d'expo-secure-store et part en
 * `Authorization: Bearer`. Aucune règle métier ici (§9.1).
 */
export const api = createApiClient({
  baseUrl: baseUrl(),
  getToken: getSessionToken,
});
