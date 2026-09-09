import { describe, expect, it } from "vitest";
import { splitTtc, freezeInvoiceContent } from "./invoice-content";
import type { Env } from "../config/env";

describe("splitTtc", () => {
  it("décompose un TTC en HT + TVA (20 %)", () => {
    expect(splitTtc(142_800, 20)).toEqual({ subtotalCents: 119_000, vatCents: 23_800 });
  });
  it("HT + TVA redonnent toujours exactement le TTC", () => {
    for (const total of [100, 999, 1_234, 19_900, 250_017]) {
      const { subtotalCents, vatCents } = splitTtc(total, 20);
      expect(subtotalCents + vatCents).toBe(total);
    }
  });
  it("gère un taux de TVA à 0", () => {
    expect(splitTtc(5_000, 0)).toEqual({ subtotalCents: 5_000, vatCents: 0 });
  });
});

describe("freezeInvoiceContent", () => {
  it("fige l'identité vendeur depuis la configuration", () => {
    const env = {
      SELLER_NAME: "Tando SAS",
      SELLER_ADDRESS: "1 rue de la Paix, Paris",
      SELLER_LEGAL: "SAS · SIREN 000",
    } as unknown as Env;
    const c = freezeInvoiceContent(env, "Garage Durand");
    expect(c.seller.name).toBe("Tando SAS");
    expect(c.buyer.name).toBe("Garage Durand");
    expect(c.legalNotice).toContain("L.441-10");
  });
});
