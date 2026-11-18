import { readFileSync } from "node:fs";
import { findJargon } from "@tando/copy/blacklist";
import { FLOWS, buildWorkflow, serialize, workflowPath } from "./build";
import type { FlowReply, FlowRequest } from "./common";
import { handle } from "./dentiste";

// Samedi 14 novembre 2026, 11h à Paris.
const NOW = new Date("2026-11-14T10:00:00.000Z");

function req(text: string, over: Partial<FlowRequest> = {}): FlowRequest {
  return {
    version: 2,
    channel: "sms",
    text,
    assistant: {
      id: "a1",
      name: "Léa",
      role: "votre assistante de cabinet dentaire",
      professionSlug: "dentiste",
      workflowScope: "metier",
      jobDescription: {},
      establishment: {
        name: "Cabinet du Parc",
        address: "12 rue des Lilas, Lyon",
        openingHours: "du lundi au vendredi, 9h-19h",
      },
      specifics: {
        praticiens: "Dr Martin, Dr Benali",
        types_soins: "Soins, détartrage, implants, blanchiment",
        urgences: "oui",
        logiciel_agenda: "Google Agenda",
      },
      ...over.assistant,
    },
    instructions: [],
    switches: { rendez_vous: true, nouveaux_patients: true },
    history: [],
    ...over,
  };
}

function texts(r: FlowReply): string[] {
  if (r.kind === "escalate") return [r.question, r.context, r.ackText, r.summary];
  return [r.text, r.summary];
}

describe("flux dentiste — garde-fous", () => {
  it("transmet toute douleur, avec le rappel du 15", () => {
    const r = handle(req("J'ai une rage de dents depuis cette nuit"), NOW);
    expect(r.kind).toBe("escalate");
    if (r.kind !== "escalate") return;
    expect(r.ackText).toContain("15");
    expect(r.context).toContain("accepte les urgences");
  });

  it("signale au cabinet qu'il a dit ne pas prendre les urgences", () => {
    const r = handle(req("ma joue est gonflée", { assistant: { ...req("").assistant, specifics: { urgences: "non" } } }), NOW);
    expect(r.kind === "escalate" && r.context).toContain("réorienter");
  });

  it("ne donne jamais de conseil médical", () => {
    const r = handle(req("Je peux prendre de l'ibuprofène après l'extraction ?"), NOW);
    expect(r.kind).toBe("escalate");
    expect(r.kind === "escalate" && r.ackText).toContain("conseil médical");
  });

  it("ne se déclenche pas sur un mot qui en contient un autre", () => {
    const r = handle(req("Il y a un bus qui passe devant ?"), NOW);
    expect(r.kind).toBe("reply");
  });

  it("transmet une demande hors cadre", () => {
    const r = handle(req("Mon fils a perdu son appareil photo dans la salle d'attente"), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("transmet si le corps reçu est invalide", () => {
    expect(handle({ version: 1 } as unknown as FlowRequest, NOW).kind).toBe("escalate");
  });
});

describe("flux dentiste — rendez-vous", () => {
  it("demande un jour quand rien n'est précisé", () => {
    const r = handle(req("Bonjour, je voudrais un rendez-vous pour un contrôle"), NOW);
    expect(r).toMatchObject({ kind: "appointment", slotISO: null, status: "propose" });
  });

  it("note jour + heure, en heure de Paris, à confirmer par le cabinet", () => {
    const r = handle(req("Je voudrais un rdv mardi à 14h30"), NOW);
    expect(r).toMatchObject({ kind: "appointment", status: "propose" });
    if (r.kind !== "appointment") return;
    // Mardi 17 novembre 2026, 14h30 Paris = 13h30 UTC (heure d'hiver).
    expect(r.slotISO).toBe("2026-11-17T13:30:00.000Z");
    expect(r.text).toContain("mardi 17 novembre à 14h30");
  });

  it("gère l'heure d'été", () => {
    const r = handle(req("rendez-vous le 15 juin à 9h"), NOW);
    expect(r.kind === "appointment" && r.slotISO).toBe("2027-06-15T07:00:00.000Z");
  });

  it("construit le créneau sur plusieurs messages", () => {
    const r = handle(
      req("plutôt 10h", {
        history: [
          { author: "client", text: "Je voudrais un rendez-vous jeudi" },
          { author: "assistant", text: "Très bien pour jeudi 19 novembre. À quelle heure préférez-vous venir ?" },
        ],
      }),
      NOW,
    );
    expect(r.kind === "appointment" && r.slotISO).toBe("2026-11-19T09:00:00.000Z");
  });

  it("refuse une date passée", () => {
    const r = handle(req("Un rendez-vous aujourd'hui à 8h ?"), NOW);
    expect(r).toMatchObject({ kind: "appointment", slotISO: null });
    expect(r.kind === "appointment" && r.text).toContain("déjà passée");
  });

  it("reprend le praticien demandé", () => {
    const r = handle(req("Un rendez-vous avec le Dr Benali lundi 9h"), NOW);
    expect(r.kind === "appointment" && r.text).toContain("avec Dr Benali");
  });

  it("transmet la demande si le bouton « rendez-vous » est coupé", () => {
    const r = handle(req("Je voudrais un rendez-vous lundi 9h", { switches: { rendez_vous: false } }), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("décline poliment un nouveau patient si le bouton est coupé", () => {
    const r = handle(
      req("Je suis nouveau patient, je voudrais un rendez-vous", { switches: { nouveaux_patients: false } }),
      NOW,
    );
    expect(r.kind).toBe("reply");
    expect(r.kind === "reply" && r.text).toContain("pas de nouveaux patients");
  });

  it("rappelle la carte Vitale à un nouveau patient", () => {
    const r = handle(req("Première visite : un rendez-vous lundi à 10h ?"), NOW);
    expect(r.kind === "appointment" && r.text).toContain("carte Vitale");
  });

  it("transmet une annulation", () => {
    const r = handle(req("Je dois annuler mon rendez-vous de mardi"), NOW);
    expect(r.kind).toBe("escalate");
  });

  it("transmet un déplacement avec le nouveau créneau souhaité", () => {
    const r = handle(req("Je voudrais décaler mon rendez-vous à jeudi 16h"), NOW);
    expect(r.kind).toBe("escalate");
    expect(r.kind === "escalate" && r.context).toContain("jeudi 19 novembre à 16h");
  });

  it("propose Doctolib quand c'est l'agenda du cabinet", () => {
    const base = req("").assistant;
    const r = handle(
      req("Je voudrais prendre rendez-vous", {
        assistant: { ...base, specifics: { ...base.specifics, logiciel_agenda: "Doctolib" } },
      }),
      NOW,
    );
    expect(r.kind === "appointment" && r.text).toContain("Doctolib");
  });
});

describe("flux dentiste — questions courantes", () => {
  it("donne les horaires", () => {
    expect(handle(req("Vous êtes ouverts le samedi ?"), NOW)).toMatchObject({ kind: "reply" });
  });

  it("donne l'adresse et l'accès", () => {
    const base = req("").assistant;
    const r = handle(
      req("Où est-ce que je peux me garer ?", {
        assistant: { ...base, specifics: { ...base.specifics, parking: "Parking gratuit derrière le cabinet" } },
      }),
      NOW,
    );
    expect(r.kind === "reply" && r.text).toContain("Parking gratuit");
  });

  it("présente les praticiens", () => {
    const r = handle(req("Quels dentistes consultent chez vous ?"), NOW);
    expect(r.kind === "reply" && r.text).toContain("Dr Martin, Dr Benali");
  });

  it("confirme un soin listé, transmet un soin non listé", () => {
    expect(handle(req("Vous faites les implants ?"), NOW).kind).toBe("reply");
    expect(handle(req("Est-ce que vous faites l'orthodontie ?"), NOW).kind).toBe("escalate");
  });

  it("répond avec une consigne du patron", () => {
    const r = handle(
      req("Le cabinet sera fermé pendant les vacances de Noël ?", {
        instructions: ["Fermeture du cabinet pendant les vacances de Noël, du 24 décembre au 2 janvier."],
      }),
      NOW,
    );
    expect(r.kind === "reply" && r.text).toContain("24 décembre");
  });

  it("transmet les questions de mutuelle", () => {
    expect(handle(req("Vous pratiquez le tiers payant avec ma mutuelle ?"), NOW).kind).toBe("escalate");
  });
});

describe("flux dentiste — vocabulaire et contrat", () => {
  const samples = [
    "Bonjour",
    "merci beaucoup",
    "J'ai très mal",
    "Je voudrais un rendez-vous mardi 15h",
    "Vous faites le blanchiment ?",
    "Quels sont vos horaires ?",
    "Je dois annuler",
    "Ma carte vitale est périmée",
    "Il y a un problème avec ma facture",
  ];

  it.each(samples)("aucun jargon dans ce que lisent patients et patron : %s", (text) => {
    for (const s of texts(handle(req(text), NOW))) {
      expect(findJargon(s)).toEqual([]);
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe("flux n8n généré", () => {
  const flow = FLOWS.find((f) => f.slug === "dentiste")!;

  it("est à jour (sinon : pnpm -F @tando/n8n-flows build:flows)", () => {
    expect(readFileSync(workflowPath(flow), "utf8")).toBe(serialize(buildWorkflow(flow)));
  });

  it("le code du nœud s'exécute comme dans n8n", () => {
    const wf = buildWorkflow(flow) as { nodes: Array<{ type: string; parameters: { jsCode?: string } }> };
    const code = wf.nodes.find((n) => n.type === "n8n-nodes-base.code")!.parameters.jsCode!;
    const run = (body: unknown) =>
      (new Function("$input", code) as ($input: unknown) => Array<{ json: FlowReply }>)({
        first: () => ({ json: { headers: {}, body } }),
      })[0]!.json;

    expect(run(req("J'ai une rage de dents")).kind).toBe("escalate");
    expect(run(req("Je voudrais un rendez-vous")).kind).toBe("appointment");
    expect(run(req("Vous faites les implants ?")).kind).toBe("reply");
    expect(run({ nope: true }).kind).toBe("escalate");
  });
});
