import { describe, expect, it } from "vitest";
import { helpSeed } from "../../prisma/seed-data/help";
import { matchHelp, normalize, scoreArticle, stem } from "./help-matcher";

const articles = helpSeed.map((a) => ({ ...a, id: a.slug }));
const best = (q: string) => matchHelp(q, articles).best?.id ?? null;

describe("help-matcher", () => {
  it("normalise accents, apostrophes et ponctuation", () => {
    expect(normalize("Où est l’échéance ?")).toBe("ou est l echeance");
    expect(stem("factures")).toBe("factur");
    expect(stem("payee")).toBe("pay");
    expect(stem("trouver")).toBe(stem("trouve"));
  });

  it.each([
    ["Je ne trouve pas mes factures", "trouver-factures"],
    ["comment je paye la facture du mois ?", "payer-facture"],
    ["mon paiement a été refusé", "paiement-refuse"],
    ["Je veux résilier", "resilier"],
    ["on part en vacances, comment le mettre en pause ?", "mettre-en-pause"],
    ["comment lui donner une nouvelle consigne", "le-former"],
    ["il a fait une erreur avec un client", "mauvaise-reponse"],
    ["changer les horaires d'ouverture", "horaires"],
    ["pourquoi il me remonte des demandes à valider", "a-valider"],
    ["je voudrais exporter mes données RGPD", "export-donnees"],
    ["comment régler les notifications ?", "notifications"],
    ["je veux parler à un conseiller", "joindre-velekya"],
    ["factures", "trouver-factures"],
  ])("« %s » → %s", (question, slug) => {
    expect(best(question)).toBe(slug);
  });

  it("ne répond pas à une question hors sujet", () => {
    const m = matchHelp("quelle est la capitale de l'Australie", articles);
    expect(m.best).toBeNull();
    expect(m.suggestions).toEqual([]);
  });

  it("propose des pistes sans trancher quand la question est vague", () => {
    const m = matchHelp("téléphone", articles);
    expect(m.best).toBeNull();
    expect(m.suggestions.length).toBeGreaterThan(0);
  });

  it("une expression-clé compte plus qu'un mot isolé", () => {
    const a = { id: "a", question: "Autre chose", keywords: ["mauvaise réponse"] };
    expect(scoreArticle("c'est une mauvaise réponse", a)).toBeGreaterThanOrEqual(5);
  });

  it("n'écarte pas la meilleure fiche des pistes par erreur", () => {
    const m = matchHelp("où trouver mes factures à payer", articles);
    expect(m.best).not.toBeNull();
    expect(m.suggestions.map((s) => s.id)).not.toContain(m.best?.id);
  });
});
