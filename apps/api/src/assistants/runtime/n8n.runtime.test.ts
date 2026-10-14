import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../config/env";
import { N8nRuntime, workflowUrl } from "./n8n.runtime";
import { RuleBasedRuntime } from "./rule-based.runtime";
import type { RuntimeContext } from "./assistant-runtime";

const env = {
  N8N_WEBHOOK_URL: "http://n8n.test/webhook/tando-{workflow}",
  N8N_TOKEN: "secret",
  N8N_TIMEOUT_MS: 1000,
} as Env;

const runtime = new N8nRuntime(env, new RuleBasedRuntime());

function ctx(professionSlug: string | null = "dentiste"): RuntimeContext {
  return {
    assistant: {
      id: "a1",
      name: "Léa",
      role: "votre assistante",
      professionSlug,
      jobDescription: { limits: ["Ne jamais donner un prix"] },
      establishment: { openingHours: "Lun-Ven 9h-18h" },
      specifics: {},
    },
    instructions: ["Le parking est derrière."],
    history: [],
  };
}

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("workflowUrl", () => {
  it("remplace {workflow} par le métier", () => {
    expect(workflowUrl("https://n/webhook/tando-{workflow}", "garage")).toBe("https://n/webhook/tando-garage");
    expect(workflowUrl("https://n/webhook/tando", "garage")).toBe("https://n/webhook/tando");
  });
});

describe("N8nRuntime", () => {
  it("appelle le workflow du métier avec le contexte et le jeton", async () => {
    const fetch = mockFetch({ kind: "reply", text: "Oui, le parking est derrière.", capability: "questions", summary: "Parking." });
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Il y a un parking ?" });

    expect(reply).toEqual({ kind: "reply", text: "Oui, le parking est derrière.", capability: "questions", summary: "Parking." });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://n8n.test/webhook/tando-dentiste");
    expect((init.headers as Record<string, string>)["x-tando-token"]).toBe("secret");
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ version: 1, workflow: "dentiste", channel: "sms", instructions: ["Le parking est derrière."] });
  });

  it("route un assistant sur mesure vers le workflow « sur-mesure »", async () => {
    const fetch = mockFetch([{ kind: "reply", text: "Bonjour !", capability: "questions", summary: "Accueil." }]);
    const reply = await runtime.handle(ctx(null), { channel: "email", text: "Bonjour" });
    expect(reply.kind).toBe("reply");
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("http://n8n.test/webhook/tando-sur-mesure");
  });

  it("accepte un rendez-vous", async () => {
    mockFetch({ kind: "appointment", text: "C'est noté jeudi 14h.", summary: "RDV.", slotISO: "2026-10-15T12:00:00.000Z", status: "confirme" });
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Un rdv jeudi 14h" });
    expect(reply).toMatchObject({ kind: "appointment", status: "confirme" });
  });

  it("garde-fous : prix, urgence, humain ne partent jamais vers n8n", async () => {
    const fetch = mockFetch({});
    for (const text of ["Combien coûte un détartrage ?", "C'est urgent !", "Je voudrais parler à un humain"]) {
      const reply = await runtime.handle(ctx(), { channel: "sms", text });
      expect(reply.kind).toBe("escalate");
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("escalade si la réponse est invalide", async () => {
    mockFetch({ kind: "reply", text: "" });
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Vous faites les blanchiments ?" });
    expect(reply.kind).toBe("escalate");
  });

  it("escalade si n8n répond en erreur", async () => {
    mockFetch({ message: "boom" }, 500);
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Vous faites les blanchiments ?" });
    expect(reply).toMatchObject({ kind: "escalate", ackText: expect.stringContaining("transmets") });
  });

  it("escalade si n8n est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Vous faites les blanchiments ?" });
    expect(reply.kind).toBe("escalate");
  });
});
