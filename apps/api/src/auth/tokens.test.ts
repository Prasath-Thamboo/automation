import { describe, expect, it } from "vitest";
import { generateToken, hashToken, tokensMatch } from "./tokens";

describe("tokens", () => {
  it("génère un jeton assez long pour verifyMagicLinkSchema (min 20)", () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(20);
    expect(token).not.toMatch(/[^A-Za-z0-9_-]/); // base64url
  });

  it("deux jetons successifs diffèrent", () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it("tokensMatch vrai pour le bon jeton, faux sinon", () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(tokensMatch(token, hash)).toBe(true);
    expect(tokensMatch(generateToken(), hash)).toBe(false);
  });
});
