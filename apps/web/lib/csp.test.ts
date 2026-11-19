import { describe, expect, it } from "vitest";
import { buildCsp, newNonce, originOf } from "./csp";

const base = { nonce: "abc", apiOrigin: "https://api.velekya.fr", dev: false, embeddable: false };
const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("n'autorise que les scripts portant le nonce de la requête", () => {
    const csp = buildCsp(base);
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("autorise l'API dans connect-src", () => {
    expect(directive(buildCsp(base), "connect-src")).toBe("connect-src 'self' https://api.velekya.fr");
  });

  it("interdit le cadrage, sauf pour le formulaire public", () => {
    expect(directive(buildCsp(base), "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(buildCsp({ ...base, embeddable: true }), "frame-ancestors")).toBe("frame-ancestors *");
  });

  it("assouplit pour le rechargement à chaud en développement", () => {
    const csp = buildCsp({ ...base, dev: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("newNonce / originOf", () => {
  it("produit un nonce différent à chaque appel", () => {
    expect(newNonce()).not.toBe(newNonce());
    expect(newNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("extrait l'origine d'une URL", () => {
    expect(originOf("http://localhost:3333/api/v1")).toBe("http://localhost:3333");
    expect(originOf("pas une url")).toBe("'self'");
  });
});
