import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canReceiveSms,
  dialTwiml,
  isCallableNumber,
  isOptOut,
  sayTwiml,
  stringParams,
  toE164,
  twilioSignature,
  verifyTwilioSignature,
} from "./twilio";

describe("signature Twilio", () => {
  const url = "https://api.tando.fr/api/v1/channels/twilio/sms";
  const params = { To: "+33100000000", From: "+33612345678", Body: "Bonjour", MessageSid: "SM1" };

  it("suit l'algorithme documenté (URL + paramètres triés, HMAC-SHA1 base64)", () => {
    const expected = createHmac("sha1", "secret")
      .update(`${url}BodyBonjourFrom+33612345678MessageSidSM1To+33100000000`)
      .digest("base64");
    expect(twilioSignature("secret", url, params)).toBe(expected);
  });

  it("accepte la bonne signature, refuse le reste", () => {
    const sig = twilioSignature("secret", url, params);
    expect(verifyTwilioSignature("secret", url, params, sig)).toBe(true);
    expect(verifyTwilioSignature("secret", url, { ...params, Body: "Autre" }, sig)).toBe(false);
    expect(verifyTwilioSignature("secret", `${url}?x=1`, params, sig)).toBe(false);
    expect(verifyTwilioSignature(undefined, url, params, sig)).toBe(false);
    expect(verifyTwilioSignature("secret", url, params, undefined)).toBe(false);
  });

  it("ignore les valeurs non textuelles du corps", () => {
    expect(stringParams({ a: "1", b: 2, c: ["x"] })).toEqual({ a: "1" });
    expect(stringParams(null)).toEqual({});
  });
});

describe("TwiML", () => {
  it("échappe le texte prononcé", () => {
    expect(sayTwiml("Chez <Dupont> & fils")).toContain("Chez &lt;Dupont&gt; &amp; fils");
    expect(sayTwiml("x")).toContain('language="fr-FR"');
  });

  it("fait sonner le patron avec un rappel en cas de non-réponse", () => {
    const t = dialTwiml("+33611111111", "+33100000000", "https://x/after?a=1&b=2");
    expect(t).toContain("<Number>+33611111111</Number>");
    expect(t).toContain('action="https://x/after?a=1&amp;b=2"');
  });
});

describe("numéros", () => {
  it("normalise en E.164", () => {
    expect(toE164("06 12 34 56 78")).toBe("+33612345678");
    expect(toE164("0033 6.12.34.56.78")).toBe("+33612345678");
    expect(toE164("+33 1 23 45 67 89")).toBe("+33123456789");
    expect(toE164("12")).toBeNull();
  });

  it("reconnaît les appels masqués", () => {
    expect(isCallableNumber("anonymous")).toBe(false);
    expect(isCallableNumber("+266696687")).toBe(false);
    expect(isCallableNumber(undefined)).toBe(false);
    expect(isCallableNumber("+33612345678")).toBe(true);
  });

  it("n'envoie de SMS qu'aux mobiles en France", () => {
    expect(canReceiveSms("+33612345678")).toBe(true);
    expect(canReceiveSms("+33712345678")).toBe(true);
    expect(canReceiveSms("+33123456789")).toBe(false);
    expect(canReceiveSms("+32470123456")).toBe(true);
  });

  it("détecte les désinscriptions", () => {
    expect(isOptOut(" STOP ")).toBe(true);
    expect(isOptOut("Arrêt")).toBe(true);
    expect(isOptOut("stop, je voulais dire autre chose")).toBe(false);
  });
});
