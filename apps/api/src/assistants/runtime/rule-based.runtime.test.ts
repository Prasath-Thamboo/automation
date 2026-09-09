import { describe, expect, it } from "vitest";
import { RuleBasedRuntime } from "./rule-based.runtime";
import { detectIntent, parseSlot } from "./intent";
import type { RuntimeContext } from "./assistant-runtime";

const runtime = new RuleBasedRuntime();

function ctx(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  return {
    assistant: {
      id: "a1",
      name: "Léa",
      role: "votre assistante",
      jobDescription: { limits: ["Ne jamais donner un prix"], hours: "" },
      establishment: { openingHours: "Lun-Ven 9h-18h", address: "12 rue Centrale" },
      specifics: { parking: "Un parking se trouve derrière le bâtiment." },
    },
    instructions: [],
    history: [],
    ...overrides,
  };
}

describe("detectIntent", () => {
  it("classe les messages courants", () => {
    expect(detectIntent("Bonjour")).toBe("salutation");
    expect(detectIntent("Quels sont vos horaires ?")).toBe("horaires");
    expect(detectIntent("C'est quoi votre adresse et le parking ?")).toBe("adresse");
    expect(detectIntent("Combien coûte une séance ?")).toBe("prix");
    expect(detectIntent("C'est une urgence !")).toBe("urgence");
    expect(detectIntent("Je voudrais un rendez-vous jeudi")).toBe("rdv");
    expect(detectIntent("Je peux parler à un humain ?")).toBe("humain");
    expect(detectIntent("Est-ce que le chat est noir")).toBe("inconnu");
  });
});

describe("parseSlot", () => {
  it("résout jour + heure", () => {
    const now = new Date("2026-01-05T09:00:00.000Z"); // lundi
    const r = parseSlot("je peux venir jeudi à 14h", now);
    expect(r.hasTime).toBe(true);
    expect(r.date?.getUTCDay()).toBe(4); // jeudi
    expect(r.date?.getUTCHours()).toBe(14);
  });
  it("jour seul -> pas d'heure", () => {
    const r = parseSlot("plutôt mardi", new Date("2026-01-05T09:00:00.000Z"));
    expect(r.date).not.toBeNull();
    expect(r.hasTime).toBe(false);
  });
});

describe("RuleBasedRuntime.handle", () => {
  it("répond aux horaires depuis l'établissement", async () => {
    const r = await runtime.handle(ctx(), { channel: "email", text: "vous êtes ouverts quand ?" });
    expect(r.kind).toBe("reply");
    if (r.kind === "reply") expect(r.text).toContain("Lun-Ven 9h-18h");
  });

  it("donne l'adresse avec l'info parking des spécificités", async () => {
    const r = await runtime.handle(ctx(), { channel: "telephone", text: "comment venir, il y a un parking ?" });
    expect(r.kind).toBe("reply");
    if (r.kind === "reply") expect(r.text).toContain("parking");
  });

  it("escalade toute demande de prix (garde-fou)", async () => {
    const r = await runtime.handle(ctx(), { channel: "telephone", text: "c'est quel prix ?" });
    expect(r.kind).toBe("escalate");
    if (r.kind === "escalate") expect(r.ackText.length).toBeGreaterThan(0);
  });

  it("escalade une urgence sans jamais la confirmer", async () => {
    const r = await runtime.handle(ctx(), { channel: "telephone", text: "urgent, j'ai très mal" });
    expect(r.kind).toBe("escalate");
  });

  it("confirme un rendez-vous quand jour et heure sont donnés", async () => {
    const r = await runtime.handle(ctx(), {
      channel: "telephone",
      text: "je veux un rendez-vous jeudi à 14h",
    });
    expect(r.kind).toBe("appointment");
    if (r.kind === "appointment") {
      expect(r.status).toBe("confirme");
      expect(r.slotISO).not.toBeNull();
    }
  });

  it("demande la date quand le rendez-vous n'en a pas", async () => {
    const r = await runtime.handle(ctx(), { channel: "telephone", text: "je voudrais un rendez-vous" });
    expect(r.kind).toBe("appointment");
    if (r.kind === "appointment") expect(r.status).toBe("propose");
  });

  it("escalade ce qu'il ne sait pas cadrer — il n'invente pas", async () => {
    const r = await runtime.handle(ctx(), {
      channel: "instagram",
      text: "vous faites quoi pour les allergies au pollen de bouleau ?",
    });
    expect(r.kind).toBe("escalate");
  });

  it("répond grâce à une consigne du patron", async () => {
    const r = await runtime.handle(
      ctx({ instructions: ["Quand on demande le wifi, le code est BONJOUR2026."] }),
      { channel: "email", text: "vous avez le wifi ? le code wifi svp" },
    );
    expect(r.kind).toBe("reply");
  });
});
