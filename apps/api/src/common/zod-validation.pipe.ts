import { Injectable, UnprocessableEntityException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Valide le corps (ou un paramètre) d'une requête avec un schéma Zod partagé
 * (`@tando/types`). En cas d'échec : 422 avec des erreurs par champ, prêtes à
 * afficher dans un formulaire (§9.5). Aucun détail technique ne fuit.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fields: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    throw new UnprocessableEntityException({
      message: "Les informations envoyées ne sont pas valides. Vérifiez les champs signalés.",
      fields,
    });
  }
}
