/**
 * Isolation multi-organisation centralisée (§9.2 : « pas de filtrage laissé à la
 * main de chaque requête »).
 *
 * `forOrganization(prisma, organizationId)` renvoie un client Prisma étendu qui,
 * pour tout modèle portant une colonne `organizationId` :
 *  - injecte `organizationId` dans le `where` des lectures et des écritures ;
 *  - force `organizationId` à la bonne valeur dans les `create` / `createMany`.
 *
 * Les modèles sans `organizationId` (User, Session, …) passent inchangés.
 * Au Lot 0 aucun modèle métier scoppé n'existe encore ; ce helper est en place et
 * testé pour que les lots suivants s'y branchent sans réécrire la règle.
 */
import type { PrismaClient } from "@prisma/client";

/** Modèles portant une colonne `organizationId` (mettre à jour à chaque lot). */
const ORG_SCOPED_MODELS = new Set<string>([
  // "Assistant", "Quote", "Mission", "Conversation", "Escalation", ... (lots suivants)
]);

const WRITE_WITH_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
]);

export type OrgScopedClient = ReturnType<typeof forOrganization>;

export function forOrganization(prisma: PrismaClient, organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!ORG_SCOPED_MODELS.has(model)) return query(args);

          const next = { ...(args as Record<string, unknown>) };

          if (WRITE_WITH_WHERE.has(operation)) {
            next.where = { ...(next.where as object), organizationId };
          }

          if (operation === "create") {
            next.data = { ...(next.data as object), organizationId };
          }

          if (operation === "createMany") {
            const data = next.data as Record<string, unknown> | Record<string, unknown>[];
            next.data = Array.isArray(data)
              ? data.map((row) => ({ ...row, organizationId }))
              : { ...data, organizationId };
          }

          if (operation === "upsert") {
            next.where = { ...(next.where as object), organizationId };
            next.create = { ...(next.create as object), organizationId };
          }

          return query(next);
        },
      },
    },
  });
}

/** Exposé pour les tests : liste courante des modèles scoppés. */
export function orgScopedModels(): string[] {
  return [...ORG_SCOPED_MODELS];
}
