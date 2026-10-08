import { describe, expect, it } from "vitest";
import { parseBrevoInbound, stripQuoted } from "./brevo-inbound";

const own = ["in.tando.fr"];

function item(over: Record<string, unknown> = {}) {
  return {
    Uuid: ["u-1"],
    MessageId: "<abc@mail.example>",
    From: { Name: "Julie Martin", Address: "Julie.Martin@Example.com" },
    To: [{ Name: null, Address: "Garage-Dupont-1a2b@in.tando.fr" }],
    Subject: "Rendez-vous",
    RawTextBody: "Bonjour,\nje voudrais un rendez-vous jeudi.\n\nLe 3 oct., Garage a écrit :\n> ancien",
    ExtractedMarkdownMessage: "Bonjour,\nje voudrais un rendez-vous jeudi.",
    Headers: {},
    SpamScore: 0.4,
    ...over,
  };
}

describe("parseBrevoInbound", () => {
  it("lit un email client", () => {
    const { emails, skipped } = parseBrevoInbound({ items: [item()] }, own);
    expect(skipped).toEqual([]);
    expect(emails).toEqual([
      {
        eventId: "<abc@mail.example>",
        recipients: ["garage-dupont-1a2b@in.tando.fr"],
        replyTo: "julie.martin@example.com",
        firstName: "Julie",
        subject: "Rendez-vous",
        messageId: "<abc@mail.example>",
        text: "Bonjour,\nje voudrais un rendez-vous jeudi.",
      },
    ]);
  });

  it("préfère Reply-To à From", () => {
    const { emails } = parseBrevoInbound(
      { items: [item({ ReplyTo: { Address: "reponse@example.com" } })] },
      own,
    );
    expect(emails[0]?.replyTo).toBe("reponse@example.com");
  });

  it("coupe l'historique cité quand Brevo n'a rien extrait", () => {
    const { emails } = parseBrevoInbound({ items: [item({ ExtractedMarkdownMessage: null })] }, own);
    expect(emails[0]?.text).toBe("Bonjour,\nje voudrais un rendez-vous jeudi.");
  });

  it("ignore réponses automatiques, listes, rebonds, boucles, indésirables et vides", () => {
    const { emails, skipped } = parseBrevoInbound(
      {
        items: [
          item({ Headers: { "Auto-Submitted": "auto-replied" } }),
          item({ Headers: { Precedence: "bulk" } }),
          item({ Headers: { "List-Id": "<news.example>" } }),
          item({ From: { Address: "MAILER-DAEMON@example.com" } }),
          item({ From: { Address: "autre-9f9f@in.tando.fr" } }),
          item({ SpamScore: 9 }),
          item({ ExtractedMarkdownMessage: "  ", RawTextBody: "> cité seulement" }),
          item({ From: null }),
        ],
      },
      own,
    );
    expect(emails).toEqual([]);
    expect(skipped).toEqual([
      "automatique",
      "automatique",
      "automatique",
      "automatique",
      "boucle",
      "indesirable",
      "vide",
      "invalide",
    ]);
  });

  it("tolère une charge vide ou mal formée", () => {
    expect(parseBrevoInbound(null, own).emails).toEqual([]);
    expect(parseBrevoInbound({ items: "x" }, own).emails).toEqual([]);
  });
});

describe("stripQuoted", () => {
  it("s'arrête à « On … wrote: »", () => {
    expect(stripQuoted("Merci !\nOn Mon, Oct 6, Bob wrote:\nvieux")).toBe("Merci !");
  });
});
