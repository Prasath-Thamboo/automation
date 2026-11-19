import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { channelKeyring, open, seal, sealedVersion, singleKey } from "./secret-box";

const b64 = (k: Buffer) => k.toString("base64");
const env = (over: Record<string, unknown>) =>
  ({ SESSION_SECRET: "x".repeat(32), CHANNEL_SECRET_KEY_VERSION: 1, ...over }) as never;

describe("secret-box", () => {
  const key = randomBytes(32);
  const ring = singleKey(key);

  it("chiffre puis déchiffre", () => {
    const sealed = seal("+33612345678", ring);
    expect(sealed).not.toContain("612345678");
    expect(open(sealed, ring)).toBe("+33612345678");
  });

  it("produit un chiffré différent à chaque fois", () => {
    expect(seal("a@b.fr", ring)).not.toBe(seal("a@b.fr", ring));
  });

  it("refuse une valeur altérée ou une autre clé", () => {
    const sealed = seal("secret", ring);
    const parts = sealed.split(".");
    parts[3] = Buffer.from("autre").toString("base64url");
    expect(open(parts.join("."), ring)).toBeNull();
    expect(open(sealed, singleKey(randomBytes(32)))).toBeNull();
    expect(open("n'importe quoi", ring)).toBeNull();
  });

  it("lit les valeurs `v1.` écrites avant le Lot 19", () => {
    // Format historique, reconstitué à la main.
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([cipher.update("ancien@client.fr", "utf8"), cipher.final()]);
    const legacy = ["v1", iv, cipher.getAuthTag(), ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
    expect(open(legacy, ring)).toBe("ancien@client.fr");
  });
});

describe("rotation de clé", () => {
  const k1 = randomBytes(32);
  const k2 = randomBytes(32);

  it("chiffre avec la clé courante et lit encore l'ancienne", () => {
    const old = seal("+33600000000", singleKey(k1, 1));
    const ring = channelKeyring(
      env({ CHANNEL_SECRET_KEY: b64(k2), CHANNEL_SECRET_KEY_VERSION: 2, CHANNEL_SECRET_KEY_PREVIOUS: `1:${b64(k1)}` }),
    );
    expect(open(old, ring)).toBe("+33600000000");
    const fresh = seal("+33600000000", ring);
    expect(sealedVersion(fresh)).toBe(2);
    // Une fois l'ancienne clé retirée, seules les valeurs rechiffrées restent lisibles.
    const after = channelKeyring(env({ CHANNEL_SECRET_KEY: b64(k2), CHANNEL_SECRET_KEY_VERSION: 2 }));
    expect(open(fresh, after)).toBe("+33600000000");
    expect(open(old, after)).toBeNull();
  });

  it("dérive une clé v1 de SESSION_SECRET hors production, stable d'un démarrage à l'autre", () => {
    const a = channelKeyring(env({}));
    expect(a.current).toBe(1);
    expect(open(seal("x", a), channelKeyring(env({})))).toBe("x");
  });

  it("refuse une configuration incohérente", () => {
    expect(() => channelKeyring(env({ CHANNEL_SECRET_KEY: "court" }))).toThrow(/32 octets/);
    expect(() => channelKeyring(env({ CHANNEL_SECRET_KEY_VERSION: 2 }))).toThrow(/exige CHANNEL_SECRET_KEY/);
    expect(() =>
      channelKeyring(env({ CHANNEL_SECRET_KEY: b64(k2), CHANNEL_SECRET_KEY_PREVIOUS: `1:${b64(k1)}` })),
    ).toThrow(/déjà utilisée/);
    expect(() =>
      channelKeyring(env({ CHANNEL_SECRET_KEY: b64(k2), CHANNEL_SECRET_KEY_VERSION: 2, CHANNEL_SECRET_KEY_PREVIOUS: b64(k1) })),
    ).toThrow(/format attendu/);
  });
});
