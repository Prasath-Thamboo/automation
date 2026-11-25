import { findJargon } from "@velekya/copy/blacklist";
import type { FlowReply, FlowRequest } from "./common";
import { factsOf, handle, tradeOf } from "./artisan";

// Mercredi 25 novembre 2026, 10h à Paris.
const NOW = new Date("2026-11-25T09:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "formulaire",
    text,
    assistant: {
      id: "a1",
      name: "Thomas",
      role: "votre assistant de chantier",
      professionSlug: "artisan-batiment",
      workflowScope: "metier",
      jobDescription: {},
      establishment: { name: "Leroy Rénovation", address: "5 ZA des Pins, Vannes", openingHours: "du lundi au vendredi, 7h30-18h" },
      specifics: {
        specialites: "Plomberie, salle de bain, carrelage, chauffage",
        zone: "Vannes et 30 km autour",
        rythme_relance: "10",
        urgences: "oui",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { rendez_vous: true, carnet_plein: false },
    history: [],
    ...over,
  };
}

const textOf = (r: FlowReply) => (r.kind === "escalate" ? r.ackText : r.text);

function texts(r: FlowReply): string[] {
  if (r.kind === "escalate") return [r.question, r.context, r.ackText, r.summary];
  return [r.text, r.summary];
}

/** Joue une conversation entière et renvoie chaque réponse. */
function play(messages: string[], over: Partial<FlowRequest> = {}): FlowReply[] {
  const history: FlowRequest["history"] = [];
  const out: FlowReply[] = [];
  for (const m of messages) {
    const r = handle(req(m, { ...over, history: [...history] }), NOW);
    out.push(r);
    history.push({ author: "client", text: m }, { author: "assistant", text: textOf(r) });
  }
  return out;
}

describe("flux artisan — urgences et sécurité", () => {
  it("odeur de gaz → on quitte les lieux, numéro d'urgence, transmis", () => {
    const r = handle(req("Ça sent le gaz dans la cuisine"), NOW);
    expect(r.kind).toBe("escalate");
    expect(textOf(r)).toContain("0 800 47 33 33");
    expect(r.kind === "escalate" && r.question).toContain("URGENT");
  });

  it("danger électrique → couper le courant, transmis", () => {
    expect(textOf(handle(req("La prise fait des étincelles"), NOW))).toContain("disjoncteur général");
  });

  it("démo du catalogue : fuite sous l'évier → urgent, couper l'eau, coordonnées", () => {
    const [a, b] = play(["Bonjour, j'ai une fuite sous l'évier de la cuisine, vous pourriez venir ?", "Mme Le Goff, 3 rue du Port, 06 11 22 33 44"]);
    expect(a!.kind).toBe("escalate");
    expect(textOf(a!)).toContain("coupez l'arrivée d'eau");
    expect(textOf(a!)).toContain("votre nom, votre adresse et un numéro");
    expect(b).toMatchObject({ kind: "reply" });
    expect(b!.kind === "reply" && b!.summary).not.toContain("06");
  });

  it("pas de dépannage urgent si l'entreprise n'en fait pas", () => {
    const r = handle(req("Plus d'eau chaude depuis ce matin", { assistant: { ...req("").assistant, specifics: { urgences: "non" } } }), NOW);
    expect(textOf(r)).toContain("ne réalise pas de dépannage en urgence");
  });
});

describe("flux artisan — demande de travaux", () => {
  it("nature → commune → délai → métré → coordonnées, une question à la fois", () => {
    const [a, b, c, d, e] = play([
      "Je voudrais refaire ma salle de bain, remplacer la baignoire par une douche",
      "À Séné",
      "D'ici deux mois",
      "Mardi à 17h",
      "Julien Morvan, 12 chemin des Mouettes, 06 55 44 33 22",
    ]);
    expect(textOf(a!)).toContain("Dans quelle commune");
    expect(textOf(b!)).toContain("Pour quand souhaitez-vous");
    expect(textOf(c!)).toContain("passer voir le chantier pour le métré");
    // Mardi 1er décembre 2026, 17h Paris = 16h UTC.
    expect(d).toMatchObject({ kind: "appointment", slotISO: "2026-12-01T16:00:00.000Z", status: "propose" });
    expect(d!.kind === "appointment" && d!.summary).toContain("commune : À Séné ; souhaité : D'ici deux mois");
    expect(textOf(d!)).toContain("À quel nom");
    expect(e).toMatchObject({ kind: "reply", capability: "rendez_vous" });
  });

  it("jour sans heure : demande l'heure puis note le passage", () => {
    const [, , , d, e] = play(["Je voudrais poser du carrelage", "Vannes", "Au plus vite", "Jeudi", "Plutôt 8h"]);
    expect(textOf(d!)).toContain("À quelle heure");
    expect(e).toMatchObject({ kind: "appointment", slotISO: "2026-11-26T07:00:00.000Z" });
  });

  it("planning plein : prévient que les délais sont plus longs", () => {
    const out = play(["Je voudrais faire installer une chaudière", "Vannes", "Cet hiver"], { switches: { carnet_plein: true } });
    expect(textOf(out[2]!)).toContain("délais de démarrage sont plus longs");
  });

  it("bouton rendez_vous coupé : la demande complète est transmise, sans passage proposé", () => {
    const out = play(["Je voudrais faire repeindre mon salon", "Theix", "Au printemps"], { switches: { rendez_vous: false } });
    expect(out[2]!.kind).toBe("escalate");
    expect(out[2]!.kind === "escalate" && out[2]!.context).toContain("commune : Theix");
  });

  it("hors des spécialités indiquées : noté, mais signalé au patron", () => {
    const r = handle(req("Je voudrais refaire la toiture de mon garage"), NOW);
    expect(r.kind === "reply" && r.summary).toContain("hors des spécialités");
  });

  it("outils : métier reconnu et lecture de la conversation", () => {
    expect(tradeOf("changer le ballon d eau chaude")?.label).toBe("plomberie");
    expect(tradeOf("repeindre la chambre")?.label).toBe("peinture");
    const facts = factsOf(
      [
        { author: "client", text: "Refaire la cuisine" },
        { author: "assistant", text: "C'est noté. Dans quelle commune se trouvent les travaux ?" },
      ],
      "Arradon",
    );
    expect(facts).toMatchObject({ nature: "Refaire la cuisine", commune: "Arradon", when: null });
  });
});

describe("flux artisan — ce qu'il ne fait jamais", () => {
  it("pas de date de démarrage, pas d'avis sur une malfaçon", () => {
    expect(handle(req("Quand pouvez-vous commencer ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Il y a des fissures depuis vos travaux, c'est une malfaçon ?"), NOW).kind).toBe("escalate");
  });

  it("réponse à un devis : accord signalé comme une bonne nouvelle, hésitation transmise", () => {
    const yes = handle(req("Bonjour, bon pour accord, on part sur le devis"), NOW);
    expect(yes.kind === "escalate" && yes.question).toContain("accepte un devis");
    expect(handle(req("On réfléchit encore, c'est un peu trop cher"), NOW).kind).toBe("escalate");
  });

  it("annulation, déplacement → transmis", () => {
    expect(handle(req("Je dois annuler votre passage de jeudi"), NOW).kind).toBe("escalate");
    const move = handle(req("Je voudrais décaler à vendredi 9h"), NOW);
    expect(move.kind === "escalate" && move.context).toContain("vendredi 27 novembre à 9h");
  });
});

describe("flux artisan — questions courantes", () => {
  it("spécialités (absent ≠ non), zone, horaires, adresse", () => {
    expect(textOf(handle(req("Vous faites le carrelage ?"), NOW))).toContain("carrelage fait partie de nos spécialités");
    expect(handle(req("Vous faites l'isolation des combles ?"), NOW).kind).toBe("escalate");
    expect(textOf(handle(req("Vous intervenez à Auray ?"), NOW))).toContain("Vannes et 30 km");
    expect(textOf(handle(req("Vous êtes joignable à quelle heure ?"), NOW))).toContain("7h30-18h");
    expect(textOf(handle(req("Quelle est votre adresse ?"), NOW))).toContain("ZA des Pins");
  });

  it("consigne du patron, politesse, et sinon transmet", () => {
    const withInstruction = req("Vous travaillez le samedi matin ?", {
      instructions: ["Nous travaillons le samedi matin uniquement pour les dépannages."],
    });
    expect(textOf(handle(withInstruction, NOW))).toContain("uniquement pour les dépannages");
    expect(handle(req("Bonjour"), NOW).kind).toBe("reply");
    expect(handle(req("Une question sur ma facture"), NOW).kind).toBe("escalate");
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });
});

describe("flux artisan — vocabulaire", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "Ça sent le gaz",
    "J'ai une fuite d'eau",
    "Je voudrais refaire ma salle de bain",
    "Quand pouvez-vous commencer ?",
    "Bon pour accord pour le devis",
    "Vous faites l'isolation ?",
    "Je dois annuler",
  ];

  it.each(samples)("aucun jargon dans ce que lisent clients et patron : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
