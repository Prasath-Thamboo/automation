import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { open, seal } from "./secret-box";

describe("secret-box", () => {
  const key = randomBytes(32);

  it("chiffre puis déchiffre", () => {
    const sealed = seal("+33612345678", key);
    expect(sealed).not.toContain("612345678");
    expect(open(sealed, key)).toBe("+33612345678");
  });

  it("produit un chiffré différent à chaque fois", () => {
    expect(seal("a@b.fr", key)).not.toBe(seal("a@b.fr", key));
  });

  it("refuse une valeur altérée ou une autre clé", () => {
    const sealed = seal("secret", key);
    const parts = sealed.split(".");
    parts[3] = Buffer.from("autre").toString("base64url");
    expect(open(parts.join("."), key)).toBeNull();
    expect(open(sealed, randomBytes(32))).toBeNull();
    expect(open("n'importe quoi", key)).toBeNull();
  });
});
