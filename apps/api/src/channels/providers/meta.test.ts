import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ATTACHMENT_TEXT, parseMetaWebhook, verifyMetaSignature } from "./meta";

describe("signature Meta", () => {
  const raw = JSON.stringify({ object: "instagram", entry: [] });
  const good = `sha256=${createHmac("sha256", "s3cret").update(raw).digest("hex")}`;

  it("accepte la bonne signature, refuse le reste", () => {
    expect(verifyMetaSignature("s3cret", raw, good)).toBe(true);
    expect(verifyMetaSignature("s3cret", `${raw} `, good)).toBe(false);
    expect(verifyMetaSignature("autre", raw, good)).toBe(false);
    expect(verifyMetaSignature(undefined, raw, good)).toBe(false);
    expect(verifyMetaSignature("s3cret", raw, undefined)).toBe(false);
  });
});

describe("parseMetaWebhook — WhatsApp", () => {
  const wa = (messages: unknown[], extra: Record<string, unknown> = {}) => ({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "33100000000", phone_number_id: "PN1" },
              contacts: [{ wa_id: "33612345678", profile: { name: "Julie Martin" } }],
              messages,
              ...extra,
            },
          },
        ],
      },
    ],
  });

  it("lit un message texte", () => {
    expect(
      parseMetaWebhook(wa([{ from: "33612345678", id: "wamid.1", type: "text", text: { body: " Bonjour " } }])),
    ).toEqual([
      {
        kind: "whatsapp",
        address: "PN1",
        from: "33612345678",
        firstName: "Julie",
        eventId: "wamid.1",
        text: "Bonjour",
      },
    ]);
  });

  it("signale les pièces jointes et lit les réponses à boutons", () => {
    const out = parseMetaWebhook(
      wa([
        { from: "33612345678", id: "wamid.2", type: "audio", audio: { id: "x" } },
        { from: "33612345678", id: "wamid.3", type: "interactive", interactive: { button_reply: { title: "Oui" } } },
      ]),
    );
    expect(out.map((m) => m.text)).toEqual([ATTACHMENT_TEXT, "Oui"]);
  });

  it("ignore les statuts de remise", () => {
    expect(parseMetaWebhook(wa([], { statuses: [{ id: "wamid.1", status: "read" }] }))).toEqual([]);
  });
});

describe("parseMetaWebhook — Instagram", () => {
  const ig = (messaging: unknown[]) => ({ object: "instagram", entry: [{ id: "IG1", time: 1, messaging }] });

  it("lit un message direct", () => {
    expect(
      parseMetaWebhook(ig([{ sender: { id: "U1" }, recipient: { id: "IG1" }, message: { mid: "m1", text: "Dispo samedi ?" } }])),
    ).toEqual([
      { kind: "instagram", address: "IG1", from: "U1", firstName: null, eventId: "m1", text: "Dispo samedi ?" },
    ]);
  });

  it("ignore échos, messages supprimés et lectures", () => {
    expect(
      parseMetaWebhook(
        ig([
          { sender: { id: "IG1" }, recipient: { id: "U1" }, message: { mid: "m2", text: "x", is_echo: true } },
          { sender: { id: "U1" }, recipient: { id: "IG1" }, message: { mid: "m3", is_deleted: true } },
          { sender: { id: "U1" }, recipient: { id: "IG1" }, read: { mid: "m1" } },
        ]),
      ),
    ).toEqual([]);
  });

  it("tolère une charge inconnue", () => {
    expect(parseMetaWebhook({ object: "page", entry: [{}] })).toEqual([]);
    expect(parseMetaWebhook(null)).toEqual([]);
  });
});
