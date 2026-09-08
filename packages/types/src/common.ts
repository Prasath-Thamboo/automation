import { z } from "zod";

/** Réponse d'erreur normalisée de l'API. Le champ `message` est destiné à l'affichage. */
export const apiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  /** Message orienté action, jamais un détail technique. */
  message: z.string(),
  /** Erreurs par champ pour les formulaires. */
  fields: z.record(z.string(), z.array(z.string())).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const membershipRole = z.enum(["owner", "member", "admin"]);
export type MembershipRole = z.infer<typeof membershipRole>;

export const idSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
