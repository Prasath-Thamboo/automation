import { describe, expect, it } from "vitest";
import { OutOfAppBillingProvider } from "./out-of-app-billing.provider";

const input = { organizationId: "org-1", customerEmail: "patron@demo.tando.local" };

describe("OutOfAppBillingProvider", () => {
  it("renvoie vers la gestion du contrat sur le web", async () => {
    const provider = new OutOfAppBillingProvider(
      "https://tando.fr/mon-equipe/compte",
      "Gérez votre contrat sur tando.fr.",
    );
    const handoff = await provider.manageHandoff(input);
    expect(provider.name).toBe("out-of-app");
    expect(handoff).toEqual({
      url: "https://tando.fr/mon-equipe/compte",
      hint: "Gérez votre contrat sur tando.fr.",
    });
  });

  it("url null quand aucune adresse de gestion n'est configurée", async () => {
    const provider = new OutOfAppBillingProvider("", "Écrivez-nous pour toute question de contrat.");
    const handoff = await provider.manageHandoff(input);
    expect(handoff.url).toBeNull();
    expect(handoff.hint).toContain("contrat");
  });
});
