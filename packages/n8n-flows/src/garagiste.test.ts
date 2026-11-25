import { findJargon } from "@velekya/copy/blacklist";
import type { FlowReply, FlowRequest } from "./common";
import { handle, motifOf, vehicleInfo } from "./garagiste";

// Mercredi 25 novembre 2026, 10h à Paris.
const NOW = new Date("2026-11-25T09:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "sms",
    text,
    assistant: {
      id: "a1",
      name: "Karim",
      role: "votre assistant d'atelier",
      professionSlug: "garagiste",
      workflowScope: "metier",
      jobDescription: {},
      establishment: { name: "Garage du Centre", address: "18 avenue de la Gare, Tours" },
      specifics: {
        prestations: "Révision, vidange, pneus, freins, embrayage, climatisation, diagnostic électronique",
        horaires: "du lundi au vendredi, 8h-12h et 14h-18h30",
        vehicule_pret: "oui",
        marques: "Renault, Peugeot, Citroën, Dacia",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { rendez_vous: true, atelier_complet: false },
    history: [],
    ...over,
  };
}

const chat = (...turns: Array<[FlowRequest["history"][number]["author"], string]>) =>
  turns.map(([author, text]) => ({ author, text }));

function texts(r: FlowReply): string[] {
  if (r.kind === "escalate") return [r.question, r.context, r.ackText, r.summary];
  return [r.text, r.summary];
}

describe("flux garage — sécurité d'abord", () => {
  it.each([
    "Je n'ai plus de freins, la pédale s'enfonce",
    "Il y a de la fumée qui sort du capot",
    "Le voyant rouge d'huile vient de s'allumer",
    "Ça sent l'odeur d'essence dans l'habitacle",
  ])("transmet tout de suite avec une consigne de sécurité : %s", (text) => {
    const r = handle(req(text), NOW);
    expect(r.kind).toBe("escalate");
    expect(r.kind === "escalate" && r.ackText).toContain("ne roulez pas");
  });

  it("véhicule immobilisé → le garage rappelle", () => {
    const r = handle(req("Ma voiture ne démarre plus ce matin"), NOW);
    expect(r).toMatchObject({ kind: "escalate", summary: expect.stringContaining("immobilisé") });
  });
});

describe("flux garage — rendez-vous", () => {
  it("note jour + heure + motif en un seul message, à confirmer par le garage", () => {
    const r = handle(req("Je voudrais faire la révision jeudi à 9h"), NOW);
    expect(r).toMatchObject({ kind: "appointment", status: "propose" });
    if (r.kind !== "appointment") return;
    // Jeudi 26 novembre 2026, 9h Paris = 8h UTC.
    expect(r.slotISO).toBe("2026-11-26T08:00:00.000Z");
    expect(r.text).toContain("pour la révision");
    expect(r.text).toContain("carte grise");
    expect(r.text).not.toContain("quelle intervention");
  });

  it("demande le motif s'il manque, puis le note", () => {
    const a = handle(req("Je peux passer au garage vendredi à 14h ?"), NOW);
    expect(a.kind === "appointment" && a.slotISO).toBe("2026-11-27T13:00:00.000Z");
    expect(a.kind === "appointment" && a.text).toContain("Pour quelle intervention");

    const history = chat(["client", "Je peux passer au garage vendredi à 14h ?"], ["assistant", a.kind === "appointment" ? a.text : ""]);
    const b = handle(req("Pour les pneus avant", { history }), NOW);
    expect(b).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(b.kind === "reply" && b.summary).toContain("pneus avant");
  });

  it("demande ce qui manque, une question à la fois", () => {
    const a = handle(req("Je voudrais un rendez-vous pour la vidange"), NOW);
    expect(a).toMatchObject({ kind: "appointment", slotISO: null });
    expect(a.kind === "appointment" && a.text).toContain("Quel jour");

    const b = handle(req("Je voudrais un rendez-vous lundi matin pour la vidange"), NOW);
    expect(b.kind === "appointment" && b.text).toContain("lundi 30 novembre dans la matinée");
    expect(b.kind === "appointment" && b.text).toContain("À quelle heure");
  });

  it("panne décrite : pose d'abord la question de préparation, puis propose le dépôt (démo du catalogue)", () => {
    const first = "Bonjour, ma voiture fait un bruit bizarre quand je freine, c'est possible de passer ?";
    const a = handle(req(first), NOW);
    expect(a.kind).toBe("appointment");
    expect(a.kind === "appointment" && a.text).toContain("grincement");

    const h1 = chat(["client", first], ["assistant", a.kind === "appointment" ? a.text : ""]);
    const b = handle(req("Un frottement métallique, à chaque fois.", { history: h1 }), NOW);
    expect(b).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(b.kind === "reply" && b.text).toContain("Quel jour");

    const h2 = [...h1, ...chat(["client", "Un frottement métallique, à chaque fois."], ["assistant", b.kind === "reply" ? b.text : ""])];
    const c = handle(req("Jeudi 9h", { history: h2 }), NOW);
    expect(c).toMatchObject({ kind: "appointment", slotISO: "2026-11-26T08:00:00.000Z" });
    expect(c.kind === "appointment" && c.text).toContain("pour les freins");
  });

  it("« oui » après « Souhaitez-vous que je note un rendez-vous ? » lance la prise de rendez-vous", () => {
    const history = chat(
      ["client", "Vous faites la clim ?"],
      ["assistant", "Oui, la climatisation fait partie de nos prestations. Souhaitez-vous que je note un rendez-vous ?"],
    );
    const r = handle(req("Oui", { history }), NOW);
    expect(r).toMatchObject({ kind: "appointment", slotISO: null });
    expect(r.kind === "appointment" && r.text).toContain("pour la climatisation");
  });

  it("créneau passé → demande un autre jour", () => {
    const r = handle(req("Rendez-vous aujourd'hui à 8h pour la vidange"), NOW);
    expect(r).toMatchObject({ kind: "appointment", slotISO: null });
    expect(r.kind === "appointment" && r.text).toContain("déjà passé");
  });

  it("bouton rendez_vous coupé → transmet", () => {
    const r = handle(req("Rendez-vous jeudi à 9h pour la révision", { switches: { rendez_vous: false } }), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("atelier complet cette semaine → propose la semaine suivante ; la semaine suivante reste notée", () => {
    const switches = { rendez_vous: true, atelier_complet: true };
    const a = handle(req("Rendez-vous jeudi à 9h pour la révision", { switches }), NOW);
    expect(a.kind).toBe("reply");
    expect(a.kind === "reply" && a.text).toContain("lundi 30 novembre");

    const b = handle(req("Rendez-vous mardi à 9h pour la révision", { switches }), NOW);
    expect(b).toMatchObject({ kind: "appointment", slotISO: "2026-12-01T08:00:00.000Z" });
  });
});

describe("flux garage — ce qu'il ne fait jamais", () => {
  it("ne donne aucun prix : demande de devis transmise, véhicule demandé s'il manque", () => {
    const a = handle(req("Il me faudrait un devis pour l'embrayage"), NOW);
    expect(a.kind).toBe("escalate");
    expect(a.kind === "escalate" && a.ackText).toContain("la marque et le nom du véhicule");
    expect(a.kind === "escalate" && a.context).toContain("l'embrayage");

    const history = chat(["client", "Il me faudrait un devis pour l'embrayage"], ["assistant", a.kind === "escalate" ? a.ackText : ""]);
    const b = handle(req("Peugeot 308 de 2016, 140 000 km", { history }), NOW);
    expect(b.kind === "reply" && b.summary).toContain("Peugeot 308, 2016, 140 000 km");
  });

  it("ne s'engage pas sur un délai ni sur l'avancement d'une réparation", () => {
    expect(handle(req("Vous allez garder la voiture combien de temps ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Bonjour, ma voiture est prête ?"), NOW)).toMatchObject({
      kind: "escalate",
      summary: expect.stringContaining("avancement"),
    });
  });

  it("annulation, déplacement, réclamation → transmis", () => {
    expect(handle(req("Je dois annuler mon rendez-vous de demain"), NOW).kind).toBe("escalate");
    const move = handle(req("Je voudrais décaler à vendredi 14h"), NOW);
    expect(move.kind === "escalate" && move.context).toContain("vendredi 27 novembre à 14h");
    expect(handle(req("C'est toujours le même problème après votre réparation"), NOW).kind).toBe("escalate");
  });
});

describe("flux garage — questions courantes", () => {
  it("prestations : oui si elle figure dans la fiche, sinon transmet (absent ≠ non)", () => {
    const yes = handle(req("Vous faites les pneus ?"), NOW);
    expect(yes.kind === "reply" && yes.text).toContain("les pneus fait partie de nos prestations");
    expect(handle(req("Vous faites la carrosserie ?"), NOW).kind).toBe("escalate");
  });

  it("marques : oui si listée, sinon transmet", () => {
    expect(handle(req("Vous prenez les Dacia ?"), NOW).kind).toBe("reply");
    expect(handle(req("Vous prenez les Tesla ?"), NOW).kind).toBe("escalate");
    const all = req("Vous prenez les Tesla ?", {
      assistant: { ...req("").assistant, specifics: { marques: "Toutes marques" } },
    });
    expect(handle(all, NOW).kind).toBe("reply");
  });

  it("véhicule de prêt : depuis la fiche (oui / non / non renseigné)", () => {
    expect(handle(req("Vous avez un véhicule de prêt ?"), NOW).kind === "reply").toBe(true);
    const no = handle(
      req("Vous avez une voiture de prêt ?", { assistant: { ...req("").assistant, specifics: { vehicule_pret: "non" } } }),
      NOW,
    );
    expect(no.kind === "reply" && no.text).toContain("ne proposons pas");
    const unknown = handle(
      req("Vous avez une voiture de prêt ?", { assistant: { ...req("").assistant, specifics: {} } }),
      NOW,
    );
    expect(unknown.kind).toBe("escalate");
  });

  it("horaires, adresse, documents à apporter", () => {
    expect(handle(req("Vous êtes ouverts le samedi ?"), NOW)).toMatchObject({
      kind: "reply",
      text: expect.stringContaining("du lundi au vendredi"),
    });
    expect(handle(req("C'est où ?"), NOW)).toMatchObject({ kind: "reply", text: expect.stringContaining("avenue de la Gare") });
    expect(handle(req("Je dois apporter quels papiers ?"), NOW)).toMatchObject({
      kind: "reply",
      text: expect.stringContaining("carte grise"),
    });
  });

  it("voyant décrit sans demande de rendez-vous → une question de préparation", () => {
    const r = handle(req("J'ai un voyant orange allumé depuis hier"), NOW);
    expect(r.kind === "reply" && r.text).toContain("couleur");
  });

  it("consigne du patron, politesse, et sinon transmet", () => {
    const withInstruction = req("Vous acceptez les paiements en plusieurs fois ?", {
      instructions: ["Paiement en plusieurs fois accepté à partir de 300 euros."],
    });
    expect(handle(withInstruction, NOW)).toMatchObject({ kind: "reply", text: expect.stringContaining("300 euros") });
    expect(handle(req("Bonjour"), NOW).kind).toBe("reply");
    expect(handle(req("J'ai oublié mes lunettes dans la voiture"), NOW).kind).toBe("escalate");
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });
});

describe("flux garage — outils", () => {
  it("lit le véhicule et le motif", () => {
    expect(vehicleInfo(["J'ai une Renault Clio de 2019 avec 62000 km"])).toBe("Renault Clio, 2019, 62 000 km");
    expect(vehicleInfo(["une BMW série 1"])).toBe("BMW Serie");
    expect(vehicleInfo(["bonjour"])).toBeNull();
    expect(motifOf(["Il faut changer les plaquettes"])).toBe("les freins");
    expect(motifOf(["ça siffle en roulant"])).toBe("un bruit");
  });
});

describe("flux garage — vocabulaire", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "Je voudrais faire la révision jeudi à 9h",
    "Je voudrais un rendez-vous",
    "Ma voiture fait un bruit quand je freine",
    "Je n'ai plus de freins",
    "Il me faudrait un devis",
    "Ma voiture est prête ?",
    "Vous faites la carrosserie ?",
    "Quels sont vos horaires ?",
    "Je dois annuler",
  ];

  it.each(samples)("aucun jargon dans ce que lisent clients et patron : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
