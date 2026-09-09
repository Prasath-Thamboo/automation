import { describe, expect, it } from "vitest";
import { buildJobDescription, benefitsFromAnswers } from "./job-description.builder";

describe("buildJobDescription", () => {
  const answers = {
    entreprise: "Salon Léa",
    taches: ["prendre-rdv", "rappels"],
    canaux: ["telephone", "instagram"],
    agenda: "google",
    autresOutils: ["caisse", "rien"],
    horaires: "ouverture",
    ton: "chaleureux",
    limites: "Ne jamais donner un prix. Ne jamais confirmer une urgence",
  };

  it("traduit les réponses en langage clair, sans code brut", () => {
    const jd = buildJobDescription(answers);
    expect(jd.summary).toContain("Salon Léa");
    expect(jd.tasks).toEqual([
      "Prendre, déplacer et annuler des rendez-vous dans votre agenda",
      "Rappeler vos clients avant leur rendez-vous",
    ]);
    expect(jd.channels).toEqual(["Au téléphone", "Sur Instagram et Facebook"]);
    expect(jd.tools).toEqual(["Votre Google Agenda", "Votre logiciel de caisse ou de gestion"]);
    expect(jd.hours).toBe("Pendant vos heures d'ouverture");
    expect(jd.limits).toEqual(["Ne jamais donner un prix", "Ne jamais confirmer une urgence"]);
    expect(jd.outOfScope.length).toBeGreaterThan(0);
  });

  it("reste robuste si des réponses manquent", () => {
    const jd = buildJobDescription({});
    expect(jd.tasks.length).toBeGreaterThan(0);
    expect(jd.channels.length).toBeGreaterThan(0);
    expect(jd.limits.length).toBeGreaterThan(0);
  });

  it("formule les bénéfices à partir des tâches", () => {
    expect(benefitsFromAnswers({ taches: ["prendre-rdv"] })[0]).toContain("rendez-vous");
    expect(benefitsFromAnswers({})).toEqual([]);
  });
});
