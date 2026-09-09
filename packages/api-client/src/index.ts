/**
 * Client HTTP typé, partagé par le web et le mobile.
 * Toute règle métier vit dans l'API (§9.1) : ce package ne fait que transporter
 * et valider. Les réponses sont vérifiées avec les schémas de `@tando/types`.
 */
import {
  adminProfessionListSchema,
  adminProfessionSchema,
  adminQuoteListSchema,
  adminQuoteSchema,
  apiErrorSchema,
  assessmentStateSchema,
  authResultSchema,
  catalogListSchema,
  accountInfoSchema,
  adminInvoiceListSchema,
  assistantDetailSchema,
  checkoutInfoSchema,
  conversationDetailSchema,
  documentsBundleSchema,
  creditNoteDocSchema,
  healthSchema,
  jobDescriptionContentSchema,
  paymentOutcomeSchema,
  professionDetailSchema,
  publicQuoteSchema,
  sessionUserSchema,
  startAssessmentResultSchema,
  teamListSchema,
  todaySummarySchema,
  notificationPrefsSchema,
  escalationItemSchema,
  runtimeTurnSchema,
  type AcceptQuote,
  type AdminProfession,
  type AdminProfessionList,
  type AdminQuote,
  type AdminQuoteList,
  type AssessmentState,
  type AuthResult,
  type CatalogList,
  type AccountInfo,
  type AddInstruction,
  type AdminInvoiceList,
  type AnswerEscalation,
  type AssistantDetail,
  type CheckoutInfo,
  type ConversationDetail,
  type CreateProfession,
  type CreditNoteDoc,
  type DocumentsBundle,
  type EscalationItem,
  type Health,
  type IssueCreditNote,
  type JobDescriptionContent,
  type OnboardingStep,
  type PatchAssessment,
  type PaymentOutcome,
  type RuntimeTurn,
  type TeamList,
  type TodaySummary,
  type NotificationPrefs,
  type RegisterPushToken,
  type UpdateNotificationPrefs,
  type UpdateAccount,
  type ProfessionDetail,
  type PublicQuote,
  type RequestMagicLink,
  type SessionUser,
  type StartAssessmentResult,
  type SubmitAssessment,
  type TemplateContent,
  type UpdateProfession,
  type UpdateQuote,
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

  /** Variante pour les réponses non-JSON (documents HTML, exports CSV/FEC). */
  async function requestText(path: string, init: RequestInit = {}): Promise<string> {
    const headers = new Headers(init.headers);
    const token = getToken ? await getToken() : null;
    if (token) headers.set("authorization", `Bearer ${token}`);
    let res: Response;
    try {
      res = await fetchImpl(`${root}${path}`, { ...init, headers, credentials });
    } catch {
      throw new NetworkError();
    }
    if (res.status === 401) onUnauthorized?.();
    if (!res.ok) throw new ApiError(res.status, "Le document n'a pas pu être récupéré.");
    return res.text();
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

    /**
     * Questionnaire de besoin (§4.1). Anonyme : `resumeToken` sert ensuite de
     * `getToken` pour les appels suivants (Bearer).
     */
    assessments: {
      start(email: string): Promise<StartAssessmentResult> {
        return request("/assessments", startAssessmentResultSchema, {
          method: "POST",
          body: JSON.stringify({ email }),
        });
      },
      current(): Promise<AssessmentState> {
        return request("/assessments/current", assessmentStateSchema);
      },
      preview(): Promise<JobDescriptionContent> {
        return request("/assessments/current/preview", jobDescriptionContentSchema);
      },
      save(body: PatchAssessment): Promise<AssessmentState> {
        return request("/assessments/current", assessmentStateSchema, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      },
      submit(body: SubmitAssessment): Promise<AssessmentState> {
        return request("/assessments/current/submit", assessmentStateSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
    },

    /** Devis vu par le client (lien magique dans `?token=`). */
    quotes: {
      view(number: string, token: string): Promise<PublicQuote> {
        return request(
          `/quotes/${encodeURIComponent(number)}?token=${encodeURIComponent(token)}`,
          publicQuoteSchema,
        );
      },
      accept(number: string, token: string, body: AcceptQuote): Promise<PublicQuote> {
        return request(
          `/quotes/${encodeURIComponent(number)}/accept?token=${encodeURIComponent(token)}`,
          publicQuoteSchema,
          { method: "POST", body: JSON.stringify(body) },
        );
      },
      refuse(number: string, token: string): Promise<PublicQuote> {
        return request(
          `/quotes/${encodeURIComponent(number)}/refuse?token=${encodeURIComponent(token)}`,
          publicQuoteSchema,
          { method: "POST" },
        );
      },
      documentUrl(baseUrl: string, number: string, token: string): string {
        return `${baseUrl.replace(/\/$/, "")}/api/v1/quotes/${encodeURIComponent(number)}/document?token=${encodeURIComponent(token)}`;
      },
    },

    /** Facturation, espace client (session requise). */
    me: {
      documents(): Promise<DocumentsBundle> {
        return request("/me/documents", documentsBundleSchema);
      },
      invoiceDocument(number: string): Promise<string> {
        return requestText(`/me/invoices/${encodeURIComponent(number)}/document`);
      },
      startPayment(invoiceNumber: string): Promise<CheckoutInfo> {
        return request("/me/payments/start", checkoutInfoSchema, {
          method: "POST",
          body: JSON.stringify({ invoiceNumber }),
        });
      },
      confirmPayment(paymentRef: string): Promise<PaymentOutcome> {
        return request(
          `/me/payments/${encodeURIComponent(paymentRef)}/confirm`,
          paymentOutcomeSchema,
          { method: "POST" },
        );
      },

      // ── Mon équipe (§6) ──────────────────────────────────────────────────
      team(): Promise<TeamList> {
        return request("/me/team", teamListSchema);
      },
      today(): Promise<TodaySummary> {
        return request("/me/today", todaySummarySchema);
      },
      assistant(id: string): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}`, assistantDetailSchema);
      },
      conversation(assistantId: string, conversationId: string): Promise<ConversationDetail> {
        return request(
          `/me/assistants/${assistantId}/conversations/${conversationId}`,
          conversationDetailSchema,
        );
      },
      onboarding(id: string, body: OnboardingStep): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}/onboarding`, assistantDetailSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      activateAssistant(id: string): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}/activate`, assistantDetailSchema, { method: "POST" });
      },
      addInstruction(id: string, body: AddInstruction): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}/instructions`, assistantDetailSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      simulate(id: string, text: string, sessionId?: string): Promise<RuntimeTurn> {
        return request(`/me/assistants/${id}/simulate`, runtimeTurnSchema, {
          method: "POST",
          body: JSON.stringify({ text, sessionId }),
        });
      },
      pauseAssistant(id: string): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}/pause`, assistantDetailSchema, { method: "POST" });
      },
      resumeAssistant(id: string): Promise<AssistantDetail> {
        return request(`/me/assistants/${id}/resume`, assistantDetailSchema, { method: "POST" });
      },
      answerEscalation(id: string, body: AnswerEscalation): Promise<EscalationItem> {
        return request(`/me/escalations/${id}/answer`, escalationItemSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      subscribeCatalog(slug: string): Promise<{ assistantId: string }> {
        return request(
          "/me/catalog/subscribe",
          z.object({ assistantId: z.string() }),
          { method: "POST", body: JSON.stringify({ slug }) },
        );
      },

      // ── Mon compte ──────────────────────────────────────────────────────
      account(): Promise<AccountInfo> {
        return request("/me/account", accountInfoSchema);
      },
      updateAccount(body: UpdateAccount): Promise<AccountInfo> {
        return request("/me/account", accountInfoSchema, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      },
      cancelSubscription(): Promise<AccountInfo> {
        return request("/me/account/cancel-subscription", accountInfoSchema, { method: "POST" });
      },
      exportData(): Promise<string> {
        return requestText("/me/account/export");
      },
      deleteAccount(): Promise<{ ok: true }> {
        return request("/me/account/delete", okSchema, { method: "POST" });
      },

      // ── Notifications (§6bis) ────────────────────────────────────────────
      registerPushToken(body: RegisterPushToken): Promise<{ ok: true }> {
        return request("/me/push-tokens", okSchema, {
          method: "POST",
          body: JSON.stringify(body),
        });
      },
      removePushToken(token: string): Promise<{ ok: true }> {
        return request("/me/push-tokens/remove", okSchema, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
      },
      notificationPrefs(): Promise<NotificationPrefs> {
        return request("/me/notification-preferences", notificationPrefsSchema);
      },
      updateNotificationPrefs(body: UpdateNotificationPrefs): Promise<NotificationPrefs> {
        return request("/me/notification-preferences", notificationPrefsSchema, {
          method: "PUT",
          body: JSON.stringify(body),
        });
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

      quotes: {
        list(): Promise<AdminQuoteList> {
          return request("/admin/quotes", adminQuoteListSchema);
        },
        get(id: string): Promise<AdminQuote> {
          return request(`/admin/quotes/${id}`, adminQuoteSchema);
        },
        update(id: string, body: UpdateQuote): Promise<AdminQuote> {
          return request(`/admin/quotes/${id}`, adminQuoteSchema, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        },
        send(id: string): Promise<AdminQuote> {
          return request(`/admin/quotes/${id}/send`, adminQuoteSchema, { method: "POST" });
        },
      },

      billing: {
        invoices(): Promise<AdminInvoiceList> {
          return request("/admin/invoices", adminInvoiceListSchema);
        },
        creditNote(invoiceId: string, body: IssueCreditNote): Promise<CreditNoteDoc> {
          return request(`/admin/invoices/${invoiceId}/credit-note`, creditNoteDocSchema, {
            method: "POST",
            body: JSON.stringify(body),
          });
        },
        export(params: { from?: string; to?: string; format: "csv" | "fec" }): Promise<string> {
          const q = new URLSearchParams();
          if (params.from) q.set("from", params.from);
          if (params.to) q.set("to", params.to);
          q.set("format", params.format);
          return requestText(`/admin/accounting/export?${q.toString()}`);
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
  AssessmentState,
  AssessmentAnswers,
  JobDescriptionContent,
  PublicQuote,
  QuoteLine,
  QuoteStatus,
  AdminQuote,
  AdminQuoteListItem,
  UpdateQuote,
  AcceptQuote,
  DocumentsBundle,
  InvoiceDoc,
  CreditNoteDoc,
  SubscriptionSummary,
  CheckoutInfo,
  PaymentOutcome,
  AdminInvoiceList,
  AdminInvoiceListItem,
  IssueCreditNote,
  TeamList,
  TodaySummary,
  AssistantCard,
  AssistantDetail,
  ConversationDetail,
  EscalationItem,
  Instruction,
  LogbookEntry,
  SpecificQuestion,
  AccountInfo,
  OnboardingStep,
  AddInstruction,
  AnswerEscalation,
  UpdateAccount,
  RuntimeTurn,
  AppointmentRow,
  Inbound,
  InboundResult,
  NotificationPrefs,
  RegisterPushToken,
  UpdateNotificationPrefs,
  DevicePlatform,
} from "@tando/types";
