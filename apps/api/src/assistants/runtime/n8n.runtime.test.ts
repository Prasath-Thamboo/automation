import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../config/env";
import { N8nRuntime } from "./n8n.runtime";
import { RuleBasedRuntime } from "./rule-based.runtime";
import type { RuntimeContext } from "./assistant-runtime";

const env = { N8N_TOKEN: "secret", N8N_TIMEOUT_MS: 1000, NODE_ENV: "test" } as Env;

const runtime = new N8nRuntime(env, new RuleBasedRuntime());

const FLOW = "http://n8n.test/webhook/client-42";

function ctx(workflowUrl: string | null = FLOW, scope: "client" | "metier" = "client"): RuntimeContext {
  return {
    assistant: {
      id: "a1",
      name: "Léa",
      role: "votre assistante",
      professionSlug: null,
      workflowUrl,
      workflowScope: workflowUrl ? scope : null,
      jobDescription: { limits: ["Ne jamais donner un prix"] },
      establishment: { openingHours: "Lun-Ven 9h-18h" },
      specifics: {},
    },
    instructions: ["Le parking est derrière."],
    switches: { rendez_vous: true, relance_devis: false },
    history: [],
  };
}

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("N8nRuntime", () => {
  it("appelle le flux du client avec le contexte, ses boutons et le jeton", async () => {
    const fetch = mockFetch({ kind: "reply", text: "Oui, le parking est derrière.", capability: "questions", summary: "Parking." });
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Il y a un parking ?" });

    expect(reply).toEqual({ kind: "reply", text: "Oui, le parking est derrière.", capability: "questions", summary: "Parking." });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FLOW);
    expect((init.headers as Record<string, string>)["x-velekya-token"]).toBe("secret");
    expect(JSON.parse(init.body as string)).toMatchObject({
      version: 2,
      channel: "sms",
      instructions: ["Le parking est derrière."],
      switches: { rendez_vous: true, relance_devis: false },
    });
  });

  it("sans flux branché, passe par le moteur à règles", async () => {
    const fetch = mockFetch({});
    const reply = await runtime.handle(ctx(null), { channel: "sms", text: "Bonjour" });
    expect(reply.kind).toBe("reply");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepte un rendez-vous (réponse en tableau d'items)", async () => {
    mockFetch([{ kind: "appointment", text: "C'est noté jeudi 14h.", summary: "RDV.", slotISO: "2026-10-15T12:00:00.000Z", status: "confirme" }]);
    const reply = await runtime.handle(ctx(), { channel: "sms", text: "Un rdv jeudi 14h" });
    expect(reply).toMatchObject({ kind: "appointment", status: "confirme" });
  });

  it("flux de métier : urgence et prix lui sont confiés, avec ses propres consignes", async () => {
    const fetch = mockFetch({ kind: "escalate", question: "URGENT — odeur de gaz.", context: "", ackText: "Quittez les lieux et appelez le 0 800 47 33 33.", summary: "Gaz." });
    const urgent = await runtime.handle(ctx(FLOW, "metier"), { channel: "sms", text: "Urgent, ça sent le gaz" });
    expect(urgent).toMatchObject({ kind: "escalate", ackText: expect.stringContaining("0 800 47 33 33") });

    mockFetch({ kind: "escalate", question: "Un devis accepté.", context: "", ackText: "Bonne nouvelle, je transmets.", summary: "Devis accepté." });
    const devis = await runtime.handle(ctx(FLOW, "metier"), { channel: "sms", text: "J'accepte votre devis" });
    expect(devis).toMatchObject({ kind: "escalate", question: "Un devis accepté." });
    expect(fetch).toHaveBeenCalled();
  });

  it("flux de métier : une urgence non transmise par le flux est escaladée quand même", async () => {
    mockFetch({ kind: "reply", text: "Nous sommes ouverts de 9h à 18h.", capability: "questions", summary: "Horaires." });
    const reply = await runtime.handle(ctx(FLOW, "metier"), { channel: "sms", text: "C'est urgent, vous êtes ouverts ?" });
    expect(reply).toMatchObject({ kind: "escalate", question: "Un client signale une urgence." });
  });

  it("flux de métier : la demande d'un humain ne part jamais vers n8n", async () => {
    const fetch = mockFetch({});
    const reply = await runtime.handle(ctx(FLOW, "metier"), { channel: "sms", text: "Je veux parler au patron" });
    expect(reply.kind).toBe("escalate");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("flux de métier en échec : une urgence garde sa réponse dédiée", async () => {
    mockFetch({ message: "boom" }, 500);
    const reply = await runtime.handle(ctx(FLOW, "metier"), { channel: "sms", text: "C'est urgent !" });
    expect(reply).toMatchObject({ kind: "escalate", question: "Un client signale une urgence." });
  });

  it("flux sur mesure — garde-fous : prix, urgence, humain ne partent jamais vers n8n", async () => {
    const fetch = mockFetch({});
    for (const text of ["Combien coûte un détartrage ?", "C'est urgent !", "Je veux parler au patron"]) {
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
