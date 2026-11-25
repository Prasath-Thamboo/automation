import { findJargon } from "@velekya/copy/blacklist";
import type { FlowReply, FlowRequest } from "./common";
import { handle, serviceLine, serviceOf } from "./coiffure";

// Mercredi 25 novembre 2026, 10h à Paris.
const NOW = new Date("2026-11-25T09:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "instagram",
    text,
    assistant: {
      id: "a1",
      name: "Chloé",
      role: "votre assistante d'accueil",
      professionSlug: "salon-de-coiffure",
      workflowScope: "metier",
      jobDescription: {},
      establishment: { name: "Atelier Lila", address: "7 rue Nationale, Lille" },
      specifics: {
        prestations: "Coupe femme : 45 min, 38 €\nBalayage : 2h30, 95 €\nCouleur : 1h30, 60 €\nBrushing : 30 min, 25 €",
        coiffeurs: "Sarah, Hugo",
        horaires: "du mardi au samedi, 9h-19h",
        instagram: "atelier.lila",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { rendez_vous: true, nouvelles_clientes: true },
    history: [],
    ...over,
  };
}

const chat = (...turns: Array<[FlowRequest["history"][number]["author"], string]>) =>
  turns.map(([author, text]) => ({ author, text }));

const textOf = (r: FlowReply) => (r.kind === "escalate" ? r.ackText : r.text);

function texts(r: FlowReply): string[] {
  if (r.kind === "escalate") return [r.question, r.context, r.ackText, r.summary];
  return [r.text, r.summary];
}

describe("flux salon — rendez-vous", () => {
  it("démo du catalogue : balayage samedi → 10h → nom et numéro", () => {
    const first = "Bonsoir, je voudrais un balayage samedi si possible.";
    const a = handle(req(first), NOW);
    expect(a).toMatchObject({ kind: "appointment", slotISO: null });
    expect(textOf(a)).toContain("un balayage samedi 28 novembre");
    expect(textOf(a)).toContain("À quelle heure");

    const h1 = chat(["client", first], ["assistant", textOf(a)]);
    const b = handle(req("10h svp.", { history: h1 }), NOW);
    // Samedi 28 novembre 2026, 10h Paris = 9h UTC.
    expect(b).toMatchObject({ kind: "appointment", slotISO: "2026-11-28T09:00:00.000Z", status: "propose" });
    expect(textOf(b)).toContain("À quel nom, et un numéro");

    const h2 = [...h1, ...chat(["client", "10h svp."], ["assistant", textOf(b)])];
    const c = handle(req("Inès, 06 98 76 54 32.", { history: h2 }), NOW);
    expect(c).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(textOf(c)).toContain("Merci Inès");
    // Le numéro reste dans la conversation, pas dans le carnet de bord.
    expect(c.kind === "reply" && c.summary).not.toContain("06");
  });

  it("par SMS, le salon a déjà le numéro : elle ne demande que le nom", () => {
    const r = handle(req("Je voudrais réserver une coupe vendredi à 14h", { channel: "sms" }), NOW);
    expect(r.kind === "appointment" && r.slotISO).toBe("2026-11-27T13:00:00.000Z");
    expect(textOf(r)).toContain("À quel nom dois-je noter");
    expect(textOf(r)).not.toContain("numéro");
  });

  it("demande la prestation si elle manque, et reprend le coiffeur demandé", () => {
    const a = handle(req("Je voudrais un rendez-vous avec Hugo jeudi à 11h"), NOW);
    expect(a).toMatchObject({ kind: "appointment", slotISO: null });
    expect(textOf(a)).toContain("Pour quelle prestation");
    expect(textOf(a)).toContain("avec Hugo");

    const h = chat(["client", "Je voudrais un rendez-vous avec Hugo jeudi à 11h"], ["assistant", textOf(a)]);
    const b = handle(req("Une couleur", { history: h }), NOW);
    expect(b).toMatchObject({ kind: "appointment", slotISO: "2026-11-26T10:00:00.000Z" });
    expect(textOf(b)).toContain("une couleur jeudi 26 novembre à 11h avec Hugo");
  });

  it("créneau passé → autre jour ; bouton rendez_vous coupé → transmet", () => {
    expect(textOf(handle(req("Une coupe aujourd'hui à 8h"), NOW))).toContain("déjà passé");
    expect(handle(req("Je voudrais réserver une coupe samedi à 10h", { switches: { rendez_vous: false } }), NOW).kind).toBe(
      "escalate",
    );
  });

  it("nouvelles clientes refusées si le bouton est coupé", () => {
    const r = handle(
      req("C'est la première fois, je voudrais réserver une coupe samedi", { switches: { nouvelles_clientes: false } }),
      NOW,
    );
    expect(r.kind).toBe("reply");
    expect(textOf(r)).toContain("ne prend malheureusement pas de nouvelles clientes");
    const ok = handle(req("C'est la première fois, je voudrais réserver une coupe samedi à 10h"), NOW);
    expect(ok.kind === "appointment" && ok.summary).toContain("Nouvelle cliente");
  });
});

describe("flux salon — ce qu'elle ne fait jamais", () => {
  it("ne conseille pas une couleur ou une coupe : le coiffeur répond", () => {
    expect(handle(req("Quelle couleur m'irait le mieux ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Je suis allergique à certaines colorations, c'est possible quand même ?"), NOW).kind).toBe("escalate");
  });

  it("réaction après une couleur → consignes de santé + transmis", () => {
    const r = handle(req("Depuis ma couleur hier ça me brûle et ça gratte"), NOW);
    expect(r.kind).toBe("escalate");
    expect(textOf(r)).toContain("Rincez abondamment");
  });

  it("annulation, déplacement, liste d'attente, réclamation, remise, mariage → transmis", () => {
    expect(handle(req("Je dois annuler mon rendez-vous de samedi"), NOW).kind).toBe("escalate");
    const move = handle(req("Je voudrais décaler à vendredi 15h"), NOW);
    expect(move.kind === "escalate" && move.context).toContain("vendredi 27 novembre à 15h");
    expect(handle(req("Prévenez-moi en cas de désistement samedi"), NOW).kind).toBe("escalate");
    expect(handle(req("Ma coupe est ratée, je ne suis pas contente"), NOW).kind).toBe("escalate");
    expect(handle(req("Vous faites une réduction étudiant ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Je cherche une coiffure pour mon mariage en juin"), NOW).kind).toBe("escalate");
  });
});

describe("flux salon — questions courantes", () => {
  it("prestations et durées depuis la fiche (absent ≠ non)", () => {
    expect(textOf(handle(req("Vous faites les balayages ?"), NOW))).toContain("Balayage : 2h30");
    expect(handle(req("Vous faites les lissages brésiliens ?"), NOW).kind).toBe("escalate");
    expect(textOf(handle(req("Ça dure longtemps un brushing ?"), NOW))).toContain("30 min");
    expect(textOf(handle(req("Quelles prestations proposez-vous ?"), NOW))).toContain("Coupe femme");
  });

  it("équipe, horaires, adresse, Instagram", () => {
    expect(textOf(handle(req("Qui sont les coiffeurs ?"), NOW))).toContain("Sarah et Hugo");
    expect(textOf(handle(req("Vous êtes ouverts le lundi ?"), NOW))).toContain("du mardi au samedi");
    expect(textOf(handle(req("C'est où ?"), NOW))).toContain("rue Nationale");
    expect(textOf(handle(req("Vous avez un compte insta ?"), NOW))).toContain("@atelier.lila");
  });

  it("consigne de la patronne, politesse, et sinon transmet", () => {
    const withInstruction = req("Vous acceptez les chèques cadeaux ?", {
      instructions: ["Nous acceptons les chèques cadeaux du salon, valables un an."],
    });
    expect(textOf(handle(withInstruction, NOW))).toContain("valables un an");
    expect(handle(req("Bonjour"), NOW).kind).toBe("reply");
    expect(handle(req("J'ai oublié mon parapluie hier"), NOW).kind).toBe("escalate");
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });

  it("outils : prestation reconnue et ligne de la fiche", () => {
    expect(serviceOf("je voudrais rafraichir ma frange")?.label).toBe("une coupe");
    expect(serviceOf("un ombre hair")?.label).toBe("un balayage");
    expect(serviceLine("Coupe : 30 min\nCouleur : 1h", serviceOf("couleur")!)).toBe("Couleur : 1h");
  });
});

describe("flux salon — vocabulaire", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "Je voudrais un balayage samedi à 10h",
    "Je voudrais un rendez-vous",
    "Quelle couleur m'irait ?",
    "Ça me brûle depuis ma couleur",
    "Vous faites les lissages ?",
    "Quels sont vos horaires ?",
    "Je dois annuler",
  ];

  it.each(samples)("aucun jargon dans ce que lisent clientes et patronne : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe("flux salon — rejeu de bout en bout (2026-11-25)", () => {
  const ask = "Parfait, je note une coupe jeudi 26 novembre à 14h avec Sarah. Le salon vous confirme le rendez-vous très vite. À quel nom, et un numéro pour la confirmation ?";

  it("nom seul → redemande le numéro ; numéro envoyé à part → noté, sans escalade", () => {
    const h1 = chat(["client", "Une coupe femme jeudi à 14h avec Sarah"], ["assistant", ask]);
    const a = handle(req("Sophie Bernard", { history: h1 }), NOW);
    expect(a).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(textOf(a)).toContain("un numéro");

    const h2 = [...h1, ...chat(["client", "Sophie Bernard"], ["assistant", textOf(a)])];
    const b = handle(req("06 12 34 56 78", { history: h2 }), NOW);
    expect(b).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(b.kind === "reply" && b.summary).not.toContain("06");
  });

  it("numéro envoyé après un « c'est noté » : remercie, sans escalade", () => {
    const h = chat(["client", "Sophie"], ["assistant", "Merci Sophie, c'est noté. Le salon vous confirme le rendez-vous très vite."]);
    const r = handle(req("Mon numéro : 06 12 34 56 78", { history: h }), NOW);
    expect(r.kind).toBe("reply");
  });

  it("une demande de prix est transmise, sans chiffre", () => {
    const r = handle(req("Combien coûte un balayage ?"), NOW);
    expect(r).toMatchObject({ kind: "escalate", question: "Une cliente demande un tarif." });
  });
});
