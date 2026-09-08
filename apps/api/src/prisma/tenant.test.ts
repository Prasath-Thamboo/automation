import { describe, expect, it, vi } from "vitest";
import { forOrganization, orgScopedModels } from "./tenant";
import type { PrismaClient } from "@prisma/client";

/**
 * Au Lot 0, aucun modèle métier n'est encore scoppé par organisation. Ces tests
 * verrouillent cet état (pour éviter une isolation à moitié câblée) et vérifient
 * que `forOrganization` délègue bien à `prisma.$extends`. Le comportement
 * d'injection de `organizationId` sera testé quand le premier modèle scoppé
 * arrivera (Lot 5/6).
 */
describe("isolation multi-organisation", () => {
  it("ne déclare aucun modèle scoppé pour l'instant", () => {
    expect(orgScopedModels()).toEqual([]);
  });

  it("forOrganization étend le client Prisma pour l'organisation donnée", () => {
    const extended = Symbol("extended");
    const $extends = vi.fn().mockReturnValue(extended);
    const prisma = { $extends } as unknown as PrismaClient;

    const result = forOrganization(prisma, "org-123");

    expect($extends).toHaveBeenCalledTimes(1);
    expect(result).toBe(extended);
    const arg = $extends.mock.calls[0]![0] as { query: { $allModels: Record<string, unknown> } };
    expect(typeof arg.query.$allModels.$allOperations).toBe("function");
  });
});
