import { findJargon } from "@velekya/copy/blacklist";
import type { FlowReply, FlowRequest } from "./common";
import { budgetOf, handle, profileOf } from "./agence";

// Mercredi 25 novembre 2026, 10h à Paris.
const NOW = new Date("2026-11-25T09:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "email",
    text,
    assistant: {
      id: "a1",
      name: "Inès",
      role: "votre assistante d'agence",
      professionSlug: "agence-immobiliere",
      workflowScope: "metier",
      jobDescription: {},
      establishment: { name: "Agence des Halles", address: "2 place des Halles, Angers", openingHours: "du lundi au samedi, 9h-19h" },
      specifics: {
        secteur: "Angers et les communes à 20 km",
        agents: "Paul Martin, Julie Roy",
        questions_quali: "",
        portails: "SeLoger, Leboncoin",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { visites: true, qualification: true },
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

describe("flux agence — visites", () => {
  it("démo du catalogue : qualification → créneau → visite notée, adresse à la confirmation", () => {
    const first = "Bonjour, le 3 pièces du centre est toujours disponible ? Je peux le visiter cette semaine ?";
    const a = handle(req(first), NOW);
    expect(a).toMatchObject({ kind: "appointment", slotISO: null });
    expect(textOf(a)).toContain("quel est votre budget");
    expect(textOf(a)).toContain("confirmer la disponibilité");

    const second = "Budget 240 000 €, j'ai un accord de principe de ma banque.";
    const h1 = chat(["client", first], ["assistant", textOf(a)]);
    const b = handle(req(second, { history: h1 }), NOW);
    expect(b).toMatchObject({ kind: "appointment", slotISO: null });
    expect(textOf(b)).toContain("Quel jour et à quelle heure");
    expect(b.kind === "appointment" && b.summary).toContain("Budget : 240 000 €, financement : accord de principe");

    const h2 = [...h1, ...chat(["client", second], ["assistant", textOf(b)])];
    const c = handle(req("Jeudi 18h", { history: h2 }), NOW);
    // Jeudi 26 novembre 2026, 18h Paris = 17h UTC.
    expect(c).toMatchObject({ kind: "appointment", slotISO: "2026-11-26T17:00:00.000Z", status: "propose" });
    expect(textOf(c)).toContain("adresse exacte");
    expect(textOf(c)).toContain("À quel nom, et un numéro");

    const h3 = [...h2, ...chat(["client", "Jeudi 18h"], ["assistant", textOf(c)])];
    const d = handle(req("Marc Dupuis, 06 12 34 56 78", { history: h3 }), NOW);
    expect(d).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(d.kind === "reply" && d.summary).not.toContain("06");

    // Le « merci » qui suit ne recrée pas de visite.
    const h4 = [...h3, ...chat(["client", "Marc Dupuis, 06 12 34 56 78"], ["assistant", textOf(d)])];
    expect(handle(req("Merci !", { history: h4 }), NOW).kind).toBe("reply");
  });

  it("budget et financement déjà donnés : pas de questions, directement le créneau", () => {
    const r = handle(req("Je voudrais visiter la maison de Trélazé samedi à 11h, budget 320k, achat comptant"), NOW);
    expect(r).toMatchObject({ kind: "appointment", slotISO: "2026-11-28T10:00:00.000Z" });
    expect(r.kind === "appointment" && r.summary).toContain("achat comptant");
  });

  it("location : questions sur la situation et la date", () => {
    const r = handle(req("Bonjour, le T2 à louer rue Lenepveu, je peux le visiter ?"), NOW);
    expect(textOf(r)).toContain("situation professionnelle");
  });

  it("une réponse qu'elle ne sait pas lire n'est pas redemandée", () => {
    const h = chat(
      ["client", "Je peux visiter l'appartement ?"],
      ["assistant", "Avec plaisir ! Pour organiser la visite : quel est votre budget, et avez-vous déjà un accord de principe pour le financement ?"],
    );
    const r = handle(req("Je préfère en parler avec le conseiller", { history: h }), NOW);
    expect(textOf(r)).toContain("Quel jour et à quelle heure");
    expect(r.kind === "appointment" && r.summary).toContain("Réponse aux questions");
  });

  it("questions de qualification du patron, si renseignées", () => {
    const r = handle(
      req("Je voudrais visiter l'appartement", {
        assistant: { ...req("").assistant, specifics: { questions_quali: "Avez-vous un bien à vendre\nQuel est votre délai" } },
      }),
      NOW,
    );
    expect(textOf(r)).toContain("Avez-vous un bien à vendre ? Quel est votre délai ?");
  });

  it("boutons : visites coupé → transmet ; qualification coupée → pas de questions", () => {
    expect(handle(req("Je voudrais visiter l'appartement", { switches: { visites: false } }), NOW).kind).toBe("escalate");
    const r = handle(req("Je voudrais visiter l'appartement", { switches: { qualification: false } }), NOW);
    expect(textOf(r)).toContain("Quel jour et à quelle heure");
  });
});

describe("flux agence — ce qu'elle ne fait jamais", () => {
  it("ne donne pas l'adresse d'un bien avant la confirmation", () => {
    const r = handle(req("Quelle est l'adresse de l'appartement ?"), NOW);
    expect(r.kind).toBe("reply");
    expect(textOf(r)).toContain("communiquée à la confirmation");
    expect(textOf(r)).not.toContain("place des Halles");
  });

  it("ne négocie pas, ne se prononce pas sur un financement, ne connaît pas la fiche du bien", () => {
    expect(handle(req("Je voudrais faire une offre à 230 000"), NOW).kind).toBe("escalate");
    expect(handle(req("Vous pensez que je peux avoir un prêt immobilier sans apport ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Il y a un ascenseur dans l'immeuble ?"), NOW).kind).toBe("escalate");
  });

  it("estimation notée pour un conseiller, avec les questions de préparation", () => {
    const a = handle(req("Je souhaite faire estimer ma maison"), NOW);
    expect(a.kind).toBe("escalate");
    expect(textOf(a)).toContain("type de bien");
    const h = chat(["client", "Je souhaite faire estimer ma maison"], ["assistant", textOf(a)]);
    const b = handle(req("Une maison de 120 m² à Avrillé", { history: h }), NOW);
    expect(b.kind === "reply" && b.summary).toContain("Avrillé");
  });

  it("annulation, déplacement, réclamation → transmis", () => {
    expect(handle(req("Je dois annuler la visite de samedi"), NOW).kind).toBe("escalate");
    const move = handle(req("Je voudrais décaler la visite à vendredi 17h"), NOW);
    expect(move.kind === "escalate" && move.context).toContain("vendredi 27 novembre à 17h");
    expect(handle(req("Personne ne répond jamais, c'est inadmissible"), NOW).kind).toBe("escalate");
  });
});

describe("flux agence — questions courantes", () => {
  it("adresse et horaires de l'agence, secteur, équipe", () => {
    expect(textOf(handle(req("Où est l'agence ?"), NOW))).toContain("place des Halles");
    expect(textOf(handle(req("Vous êtes ouverts le samedi ?"), NOW))).toContain("du lundi au samedi");
    expect(textOf(handle(req("Vous intervenez sur quel secteur ?"), NOW))).toContain("Angers");
    expect(textOf(handle(req("Qui sont les conseillers ?"), NOW))).toContain("Paul Martin et Julie Roy");
  });

  it("consigne du patron, politesse, et sinon transmet", () => {
    const withInstruction = req("Vous faites aussi la gestion des syndics de copropriété ?", {
      instructions: ["Nous ne faisons pas de syndic de copropriété, seulement transaction et location."],
    });
    expect(textOf(handle(withInstruction, NOW))).toContain("seulement transaction");
    expect(handle(req("Bonjour"), NOW).kind).toBe("reply");
    expect(handle(req("Une question sur mon dossier"), NOW).kind).toBe("escalate");
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });

  it("outils : budget et profil", () => {
    expect(budgetOf("budget 240 000 €")).toBe("240 000 €");
    expect(budgetOf("autour de 300k")).toBe("300 000 €");
    expect(budgetOf("850 euros par mois")).toBe("850 €");
    expect(budgetOf("bonjour")).toBeNull();
    expect(profileOf("je suis en CDI avec un garant", true)).toMatchObject({ complete: true });
    expect(profileOf("budget 200k", false)).toMatchObject({ complete: false, any: true });
  });
});

describe("flux agence — vocabulaire", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "Je voudrais visiter l'appartement",
    "Le T2 à louer est toujours disponible ?",
    "Je voudrais faire une offre",
    "Je souhaite faire estimer ma maison",
    "Quelle est l'adresse du bien ?",
    "Il y a combien de chambres ?",
    "Je dois annuler",
  ];

  it.each(samples)("aucun jargon dans ce que lisent contacts et patron : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
