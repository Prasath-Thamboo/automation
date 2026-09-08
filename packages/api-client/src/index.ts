/**
 * Client HTTP typé, partagé par le web et le mobile.
 * Toute règle métier vit dans l'API (§9.1) : ce package ne fait que transporter
 * et valider. Les réponses sont vérifiées avec les schémas de `@tando/types`.
 */
import {
  adminProfessionListSchema,
  adminProfessionSchema,
  apiErrorSchema,
  authResultSchema,
  catalogListSchema,
  healthSchema,
  professionDetailSchema,
  sessionUserSchema,
  type AdminProfession,
  type AdminProfessionList,
  type AuthResult,
  type CatalogList,
  type CreateProfession,
  type Health,
  type ProfessionDetail,
  type RequestMagicLink,
  type SessionUser,
  type TemplateContent,
  type UpdateProfession,
  type VerifyMagicLink,
} from "@tando/types";
import { z, type ZodType } from "zod";

const okSchema = z.object({ ok: z.literal(true) });

export interface ApiClientOptions {
  /** Ex. http://localhost:3333 */
  baseUrl: string;
  /** Préfixe de version. Défaut : /api/v1 */
  apiPrefix?: string;
  /**
   * Web : "include" pour envoyer le cookie de session httpOnly.
   * Mobile : laisser undefined et fournir `getToken`.
   */
  credentials?: RequestCredentials;
  /** Mobile : jeton Bearer récupéré depuis expo-secure-store. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Appelé sur une réponse 401 (session expirée). */
  onUnauthorized?: () => void;
  /** Injection pour les tests. Défaut : fetch global. */
  fetch?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Erreur réseau / API injoignable — message prêt à afficher (§9.5). */
export class NetworkError extends Error {
  constructor() {
    super("La connexion au service a échoué. Vérifiez votre connexion et réessayez.");
    this.name = "NetworkError";
  }
}

export function createApiClient(options: ApiClientOptions) {
  const {
    baseUrl,
    apiPrefix = "/api/v1",
    credentials,
    getToken,
    onUnauthorized,
    fetch: fetchImpl = globalThis.fetch,
  } = options;

  const root = `${baseUrl.replace(/\/$/, "")}${apiPrefix}`;

  async function request<T>(
    path: string,
    schema: ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const token = getToken ? await getToken() : null;
    if (token) headers.set("authorization", `Bearer ${token}`);

    let res: Response;
    try {
      res = await fetchImpl(`${root}${path}`, { ...init, headers, credentials });
    } catch {
      throw new NetworkError();
    }

    if (res.status === 401) onUnauthorized?.();

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await res.json() : undefined;

    if (!res.ok) {
      const parsed = apiErrorSchema.safeParse(payload);
      if (parsed.success) {
        throw new ApiError(parsed.data.statusCode, parsed.data.message, parsed.data.fields);
      }
      throw new ApiError(res.status, "Une erreur est survenue. Réessayez dans un instant.");
    }

    return schema.parse(payload);
  }

  return {
    /** État de santé de l'API (utilisé par le smoke test mobile du Lot 0). */
    health(): Promise<Health> {
      return request("/health", healthSchema);
    },

    auth: {
      /** Demande l'envoi d'un lien magique par email. */
      requestMagicLink(body: RequestMagicLink): Promise<{ ok: true }> {
        return request("/auth/magic-link", okSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      /** Échange un token de lien magique contre une session. */
      verify(body: VerifyMagicLink): Promise<AuthResult> {
        return request("/auth/verify", authResultSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      /** Utilisateur de la session courante, ou 401. */
      me(): Promise<SessionUser> {
        return request("/auth/me", sessionUserSchema);
      },
      signOut(): Promise<{ ok: true }> {
        return request("/auth/sign-out", okSchema, { method: "POST" });
      },
    },

    /** Catalogue public d'employés virtuels prêts à l'emploi (§5). */
    catalog: {
      list(): Promise<CatalogList> {
        return request("/catalog/professions", catalogListSchema);
      },
      detail(slug: string): Promise<ProfessionDetail> {
        return request(`/catalog/professions/${encodeURIComponent(slug)}`, professionDetailSchema);
      },
    },

    /** Back-office (réservé au rôle `admin`). */
    admin: {
      catalog: {
        list(): Promise<AdminProfessionList> {
          return request("/admin/catalog/professions", adminProfessionListSchema);
        },
        get(id: string): Promise<AdminProfession> {
          return request(`/admin/catalog/professions/${id}`, adminProfessionSchema);
        },
        create(body: CreateProfession): Promise<AdminProfession> {
          return request("/admin/catalog/professions", adminProfessionSchema, {
            method: "POST",
            body: JSON.stringify(body),
          });
        },
        update(id: string, body: UpdateProfession): Promise<AdminProfession> {
          return request(`/admin/catalog/professions/${id}`, adminProfessionSchema, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        },
        saveDraft(id: string, content: TemplateContent): Promise<AdminProfession> {
          return request(`/admin/catalog/professions/${id}/template`, adminProfessionSchema, {
            method: "PUT",
            body: JSON.stringify(content),
          });
        },
        publish(id: string): Promise<AdminProfession> {
          return request(
            `/admin/catalog/professions/${id}/template/publish`,
            adminProfessionSchema,
            { method: "POST" },
          );
        },
        remove(id: string): Promise<{ ok: true }> {
          return request(`/admin/catalog/professions/${id}`, okSchema, { method: "DELETE" });
        },
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export { ApiError as ApiClientError };
export type {
  AuthResult,
  Health,
  SessionUser,
  CatalogList,
  ProfessionCard,
  ProfessionDetail,
  AdminProfession,
  TemplateContent,
} from "@tando/types";
