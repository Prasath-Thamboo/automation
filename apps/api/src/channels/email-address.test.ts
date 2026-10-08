import { describe, expect, it } from "vitest";
import { inboxLocalPart, normalizeEmail } from "./email-address";

describe("inboxLocalPart", () => {
  it("translittère et suffixe", () => {
    expect(inboxLocalPart("Garage Dupont & Fils — Évry")).toMatch(/^garage-dupont-fils-evry-[0-9a-f]{4}$/);
  });

  it("retombe sur « accueil » sans nom exploitable", () => {
    expect(inboxLocalPart("   ")).toMatch(/^accueil-[0-9a-f]{4}$/);
  });

  it("tronque les noms longs sans double tiret", () => {
    const local = inboxLocalPart(`${"a".repeat(29)} bcdef`);
    expect(local.length).toBeLessThanOrEqual(35);
    expect(local).not.toMatch(/--/);
  });
});

describe("normalizeEmail", () => {
  it("met en minuscules", () => {
    expect(normalizeEmail(" Accueil@In.Tando.FR ")).toBe("accueil@in.tando.fr");
  });
});
