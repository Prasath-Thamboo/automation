import { findJargon } from "@velekya/copy/blacklist";
import type { FlowReply, FlowRequest } from "./common";
import { handle, partySize } from "./restaurateur";

// Samedi 14 novembre 2026, 11h à Paris.
const NOW = new Date("2026-11-14T10:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "sms",
    text,
    assistant: {
      id: "a1",
      name: "Marco",
      role: "votre assistant de salle",
      professionSlug: "restaurateur",
      workflowScope: "metier",
      jobDescription: {},
      establishment: { name: "Le Petit Zinc", address: "4 place du Marché, Nantes" },
      specifics: {
        capacite: "40 couverts",
        horaires: "du mardi au samedi, 12h-14h et 19h-22h30",
        carte: "https://lepetitzinc.fr/carte",
        groupes_max: "8",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { reservations: true, complet: false },
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

describe("flux restaurant — réservations", () => {
  it("note jour + heure + nombre en un seul message, à confirmer par le restaurant", () => {
    const r = handle(req("Bonjour, vous auriez une table pour 4 ce soir vers 20h ?"), NOW);
    expect(r).toMatchObject({ kind: "appointment", status: "propose" });
    if (r.kind !== "appointment") return;
    // Samedi 14 novembre 2026, 20h Paris = 19h UTC.
    expect(r.slotISO).toBe("2026-11-14T19:00:00.000Z");
    expect(r.text).toContain("pour 4 personnes");
    expect(r.text).toContain("À quel nom");
  });

  it("reprend le nom donné dans le message", () => {
    const r = handle(req("Je voudrais réserver pour 2 personnes mardi à 12h30 au nom de Durand"), NOW);
    expect(r.kind === "appointment" && r.slotISO).toBe("2026-11-17T11:30:00.000Z");
    expect(r.kind === "appointment" && r.text).toContain("au nom de Durand");
    expect(r.kind === "appointment" && r.text).not.toContain("À quel nom");
  });

  it("demande ce qui manque, une question à la fois", () => {
    const a = handle(req("Je voudrais réserver une table"), NOW);
    expect(a).toMatchObject({ kind: "appointment", slotISO: null });
    expect(a.kind === "appointment" && a.text).toContain("quel jour");

    const b = handle(req("Une table pour demain soir"), NOW);
    expect(b.kind === "appointment" && b.text).toContain("combien de personnes");

    const c = handle(req("Une table pour 3 demain"), NOW);
    expect(c.kind === "appointment" && c.text).toContain("quelle heure");
  });

  it("construit la réservation sur plusieurs messages (« ce soir » → « 4 » → « 20h »)", () => {
    const history = chat(
      ["client", "Vous auriez de la place ce soir ?"],
      ["assistant", "Très bien : samedi 14 novembre au dîner. Pour combien de personnes ?"],
    );
    const step2 = handle(req("4", { history }), NOW);
    expect(step2.kind === "appointment" && step2.text).toContain("table pour 4 personnes");

    const step3 = handle(
      req("20h", {
        history: [...history, ...chat(["client", "4"], ["assistant", step2.kind === "appointment" ? step2.text : ""])],
      }),
      NOW,
    );
    expect(step3).toMatchObject({ kind: "appointment", slotISO: "2026-11-14T19:00:00.000Z" });
  });

  it("enregistre le nom donné en réponse à « À quel nom ? »", () => {
    const r = handle(
      req("Durand", {
        history: chat(
          ["client", "Une table pour 4 ce soir à 20h"],
          ["assistant", "J'ai bien noté votre demande… À quel nom dois-je noter la réservation ?"],
        ),
      }),
      NOW,
    );
    expect(r).toMatchObject({ kind: "reply", capability: "rendez_vous" });
    expect(r.kind === "reply" && r.text).toContain("au nom de Durand");
  });

  it("ne prend pas « merci » pour un nom", () => {
    const r = handle(
      req("merci", { history: chat(["assistant", "À quel nom dois-je noter la réservation ?"]) }),
      NOW,
    );
    expect(r.kind === "reply" && r.text).not.toContain("au nom de");
  });

  it("ne lit pas « pour 20h » comme 20 personnes", () => {
    expect(partySize("une table pour 20h")).toBeNull();
    expect(partySize("on sera deux")).toBe(2);
    expect(partySize("table de 6")).toBe(6);
    expect(partySize("nous serons 5 adultes")).toBe(5);
    expect(partySize("on viendra a deux heures")).toBeNull();
    expect(partySize("on voudrait venir diner a 6 vendredi")).toBe(6);
    expect(partySize("ce soir a 8")).toBeNull();
  });

  it("garde l'heure déjà donnée en demandant ce qui manque", () => {
    const r = handle(req("On voudrait venir dîner vendredi vers 19h30"), NOW);
    expect(r.kind === "appointment" && r.text).toContain("vendredi 20 novembre à 19h30");
    expect(r.kind === "appointment" && r.text).toContain("combien de personnes");
  });

  it("comprend « midi » comme le déjeuner", () => {
    const r = handle(req("Il vous reste de la place demain midi pour 2 ?"), NOW);
    expect(r.kind === "appointment" && r.text).toContain("dimanche 15 novembre au déjeuner");
  });

  it("transmet un groupe au-delà de la taille fixée", () => {
    const r = handle(req("Une table pour 12 personnes samedi prochain à 20h"), NOW);
    expect(r.kind).toBe("escalate");
    expect(r.kind === "escalate" && r.context).toContain("8 personnes");
  });

  it("refuse un créneau déjà passé", () => {
    const r = handle(req("Une table pour 2 aujourd'hui à 9h"), NOW);
    expect(r.kind === "appointment" && r.text).toContain("déjà passé");
  });

  it("répond « complet » pour aujourd'hui quand le bouton est allumé, pas pour demain", () => {
    const switches = { reservations: true, complet: true };
    const today = handle(req("Une table pour 2 ce soir à 20h", { switches }), NOW);
    expect(today.kind === "reply" && today.text).toContain("complets aujourd'hui");
    const tomorrow = handle(req("Une table pour 2 demain à 20h", { switches }), NOW);
    expect(tomorrow.kind).toBe("appointment");
  });

  it("transmet la demande si le bouton « réservations » est coupé", () => {
    const r = handle(req("Une table pour 2 ce soir à 20h", { switches: { reservations: false } }), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("signale une allergie avec la réservation, sans rien garantir", () => {
    const r = handle(req("Une table pour 4 ce soir à 20h, une personne est allergique aux fruits de mer"), NOW);
    expect(r.kind).toBe("appointment");
    expect(r.kind === "appointment" && r.summary).toContain("Allergie");
  });

  it("transmet annulation, modification et liste d'attente", () => {
    expect(handle(req("Je dois annuler ma réservation de ce soir"), NOW).kind).toBe("escalate");
    const move = handle(req("Je voudrais décaler ma réservation à dimanche 13h"), NOW);
    expect(move.kind === "escalate" && move.context).toContain("dimanche 15 novembre à 13h");
    expect(handle(req("Vous pouvez me mettre sur liste d'attente ?"), NOW).kind).toBe("escalate");
  });

  it("transmet une privatisation", () => {
    expect(handle(req("Est-ce qu'on peut privatiser la salle pour un mariage ?"), NOW).kind).toBe("escalate");
  });
});

describe("flux restaurant — questions courantes", () => {
  it("donne les horaires de service", () => {
    const r = handle(req("Vous êtes ouverts le lundi ?"), NOW);
    expect(r.kind === "reply" && r.text).toContain("du mardi au samedi");
  });

  it.each(["C'est où ?", "Quelle est votre adresse ?", "Où est le restaurant ?"])("donne l'adresse : %s", (text) => {
    const r = handle(req(text), NOW);
    expect(r.kind === "reply" && r.text).toContain("4 place du Marché");
  });

  it("donne le lien de la carte", () => {
    const r = handle(req("Je peux voir votre menu ?"), NOW);
    expect(r.kind === "reply" && r.text).toContain("https://lepetitzinc.fr/carte");
  });

  it("transmet une question sur la carte si elle n'est pas renseignée", () => {
    const base = req("").assistant;
    const r = handle(req("C'est quoi le plat du jour ?", { assistant: { ...base, specifics: {} } }), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("ne garantit jamais l'absence d'un allergène", () => {
    const r = handle(req("Vos desserts sont sans gluten ?"), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("répond sur un régime grâce à une consigne du patron", () => {
    const r = handle(
      req("Vous avez des plats végétariens ?", {
        instructions: ["Nous proposons toujours deux plats végétariens à la carte."],
      }),
      NOW,
    );
    expect(r.kind === "reply" && r.text).toContain("deux plats végétariens");
  });

  it("ne confond pas « carte bancaire » avec la carte des plats", () => {
    const r = handle(req("Vous prenez la carte bancaire ?"), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("transmet réclamation, vente à emporter et remise", () => {
    expect(handle(req("On a été malades après le repas d'hier soir"), NOW).kind).toBe("escalate");
    expect(handle(req("Vous faites à emporter ?"), NOW).kind).toBe("escalate");
    expect(handle(req("Vous pouvez nous faire une réduction ?"), NOW).kind).toBe("escalate");
  });

  it("transmet une demande hors cadre et un corps invalide", () => {
    expect(handle(req("J'ai oublié mon écharpe hier soir"), NOW).kind).toBe("escalate");
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });
});

describe("flux restaurant — vocabulaire", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "Une table pour 4 ce soir à 20h",
    "Je voudrais réserver",
    "Vos desserts sont sans gluten ?",
    "Quels sont vos horaires ?",
    "Je dois annuler",
    "Une table pour 15 personnes samedi à 20h",
    "Il y a un problème avec l'addition",
  ];

  it.each(samples)("aucun jargon dans ce que lisent clients et patron : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
