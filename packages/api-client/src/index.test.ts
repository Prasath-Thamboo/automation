import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, createApiClient } from "./index";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("createApiClient", () => {
  it("préfixe l'URL et valide la réponse", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "ok",
        version: "0.0.0",
        uptimeSeconds: 1,
        checks: { database: "ok", redis: "ok" },
      }),
    );
    const client = createApiClient({ baseUrl: "http://x", fetch: fetchImpl });

    const health = await client.health();

    expect(health.status).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledWith("http://x/api/v1/health", expect.any(Object));
  });

  it("ajoute le Bearer quand getToken renvoie un jeton", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = createApiClient({
      baseUrl: "http://x",
      getToken: () => "jeton-123",
      fetch: fetchImpl,
    });

    await client.auth.signOut();

    const headers = fetchImpl.mock.calls[0]![1].headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer jeton-123");
  });

  it("transforme une réponse d'erreur en ApiError avec message affichable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "Cette adresse email n'a pas l'air correcte.",
          fields: { email: ["invalide"] },
        },
        { status: 422 },
      ),
    );
    const client = createApiClient({ baseUrl: "http://x", fetch: fetchImpl });

    await expect(client.auth.requestMagicLink({ email: "x", channel: "web" })).rejects.toThrow(
      ApiError,
    );
  });

  it("appelle onUnauthorized sur un 401", async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ statusCode: 401, error: "x", message: "x" }, { status: 401 }));
    const client = createApiClient({ baseUrl: "http://x", fetch: fetchImpl, onUnauthorized });

    await expect(client.auth.me()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("emballe une panne réseau dans NetworkError", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const client = createApiClient({ baseUrl: "http://x", fetch: fetchImpl });

    await expect(client.health()).rejects.toBeInstanceOf(NetworkError);
  });
});
