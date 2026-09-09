import { createApiClient } from "@tando/api-client";

/** Base d'URL de l'API, exposée au navigateur. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Jeton de reprise du questionnaire (parcours anonyme, faible sensibilité). */
const ASSESSMENT_TOKEN_KEY = "tando_assessment";

export function getAssessmentToken(): string | null {
  try {
    return localStorage.getItem(ASSESSMENT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAssessmentToken(token: string): void {
  try {
    localStorage.setItem(ASSESSMENT_TOKEN_KEY, token);
  } catch {
    /* stockage indisponible : le parcours reste utilisable sur cet onglet */
  }
}

export function clearAssessmentToken(): void {
  try {
    localStorage.removeItem(ASSESSMENT_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Client API côté navigateur, avec le jeton de reprise si présent. */
export function browserApi() {
  return createApiClient({ baseUrl: API_BASE, getToken: getAssessmentToken });
}
