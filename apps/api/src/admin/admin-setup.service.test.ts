import { describe, expect, it } from "vitest";
import { assertAllowedUrl } from "./admin-setup.service";

describe("assertAllowedUrl", () => {
  it("accepte une adresse sur l'instance n8n de Velekya", () => {
    expect(() =>
      assertAllowedUrl("https://n8n.velekya.fr/webhook/client-42", {
        N8N_BASE_URL: "https://n8n.velekya.fr",
        NODE_ENV: "production",
      }),
    ).not.toThrow();
  });

  it("refuse une adresse hors de l'instance n8n", () => {
    expect(() =>
      assertAllowedUrl("https://ailleurs.example/webhook/x", {
        N8N_BASE_URL: "https://n8n.velekya.fr",
        NODE_ENV: "production",
      }),
    ).toThrow(/n8n\.velekya\.fr/);
  });

  it("exige https en production", () => {
    expect(() =>
      assertAllowedUrl("http://n8n.velekya.fr/webhook/x", { N8N_BASE_URL: undefined, NODE_ENV: "production" }),
    ).toThrow(/https/);
  });

  it("accepte http en développement sans instance imposée", () => {
    expect(() =>
      assertAllowedUrl("http://localhost:5678/webhook/x", { N8N_BASE_URL: undefined, NODE_ENV: "development" }),
    ).not.toThrow();
  });
});
