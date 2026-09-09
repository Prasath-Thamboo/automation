import { describe, expect, it } from "vitest";
import type { PricingRule } from "@prisma/client";
import { PricingService } from "./pricing.service";
import { pricingRuleSeeds } from "./default-rules";

const rules = pricingRuleSeeds.map(
  (r, i) => ({ ...r, id: `r${i}`, active: true, createdAt: new Date(), updatedAt: new Date() }) as PricingRule,
);

const svc = new PricingService(null as never);

describe("PricingService.compute", () => {
  it("additionne socle + modules + outils, applique volume puis complexité", () => {
    const answers = {
      taches: ["prendre-rdv", "questions", "rappels"],
      volume: "50-200",
      agenda: "google",
      autresOutils: ["caisse"],
    };
    const base = svc.compute(answers, "sur-mesure", rules, 1);
    // setup : 890 (socle) + 200 + 100 + 100 (modules) + 250 (caisse) = 1540
    expect(base.setupCents).toBe(154_000);
    // mensuel : (199 + 50 + 20 + 20) * 1.15 volume = 332.35 -> arrondi euro sup = 333
    expect(base.monthlyCents).toBe(33_300);
    expect(base.lines).toHaveLength(5);
    expect(base.volumeFactor).toBe(1.15);

    const withComplexity = svc.compute(answers, "sur-mesure", rules, 1.3);
    // setup 154000 * 1.3 = 200200 ; mensuel 33235 * 1.3 = 43205.5 -> arrondi euro sup = 43300
    expect(withComplexity.setupCents).toBe(200_200);
    expect(withComplexity.monthlyCents).toBe(43_300);
  });

  it("ignore les outils sans coût (Google Agenda)", () => {
    const res = svc.compute({ taches: [], agenda: "google" }, "sur-mesure", rules, 1);
    expect(res.lines.map((l) => l.kind)).toEqual(["socle"]);
  });

  it("suggère la formule + selon le volume ou le nombre de tâches", () => {
    expect(svc.suggestFormula({ volume: "500+" })).toBe("sur-mesure-plus");
    expect(
      svc.suggestFormula({ taches: ["a", "b", "c", "d", "e"] }),
    ).toBe("sur-mesure-plus");
    expect(svc.suggestFormula({ taches: ["a"], volume: "0-50" })).toBe("sur-mesure");
  });
});
