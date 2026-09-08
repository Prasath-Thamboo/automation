import { describe, expect, it, vi } from "vitest";
import { CatalogService, parseContent } from "./catalog.service";

const validContent = {
  assistantName: "Léa",
  assistantRole: "votre assistante",
  intro: "Bonjour, voici Léa.",
  dayTimeline: [
    { time: "8h", text: "Elle répond." },
    { time: "12h", text: "Elle réserve." },
    { time: "18h", text: "Elle relance." },
  ],
  canDo: ["Prendre les rendez-vous", "Répondre au téléphone", "Rappeler les patients", "Noter les demandes"],
  cannotDo: ["Donner un diagnostic", "Fixer un prix seule"],
  demo: { intro: "Voici un échange.", messages: [{ from: "client", text: "Bonjour" }, { from: "assistant", text: "Bonjour !" }] },
  savings: {
    sliderA: { label: "Patients", min: 5, max: 50, default: 20, minutesEach: 3 },
    sliderB: { label: "Appels", min: 5, max: 50, default: 20, minutesEach: 2 },
    daysPerMonth: 22,
    note: "Estimation indicative.",
  },
  contract: { included: ["Un assistant actif", "300 demandes"], cancellation: "Résiliez en un clic." },
  personalization: [],
};

describe("parseContent", () => {
  it("valide un contenu conforme", () => {
    expect(parseContent(validContent)?.assistantName).toBe("Léa");
  });
  it("rejette un contenu incomplet", () => {
    expect(parseContent({ assistantName: "Léa" })).toBeNull();
    expect(parseContent(null)).toBeNull();
  });
});

describe("CatalogService.list", () => {
  it("ne renvoie que les métiers publiés avec version publiée, et agrège filtres", async () => {
    const prisma = {
      profession: {
        findMany: vi.fn().mockResolvedValue([
          {
            slug: "dentiste",
            name: "Cabinet dentaire",
            sector: "Santé",
            benefit: "…",
            needs: ["Prendre les rendez-vous", "Répondre au téléphone"],
            monthlyPriceEur: 89,
            trialDays: 14,
            template: { versions: [{ content: validContent }] },
          },
          {
            slug: "coiffure",
            name: "Salon",
            sector: "Beauté",
            benefit: "…",
            needs: ["Prendre les rendez-vous"],
            monthlyPriceEur: 89,
            trialDays: 14,
            template: { versions: [{ content: validContent }] },
          },
        ]),
      },
    };
    const svc = new CatalogService(prisma as never);
    const res = await svc.list();

    expect(res.professions.map((p) => p.slug)).toEqual(["dentiste", "coiffure"]);
    expect(res.professions[0]!.assistantName).toBe("Léa");
    expect(res.sectors).toEqual(["Beauté", "Santé"]);
    expect(res.needs).toEqual(["Prendre les rendez-vous", "Répondre au téléphone"]);
    expect(prisma.profession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ published: true }) }),
    );
  });
});
