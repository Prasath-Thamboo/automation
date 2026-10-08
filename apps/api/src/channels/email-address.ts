import { randomBytes } from "node:crypto";

/**
 * Partie locale lisible d'une adresse de réception : « garage-dupont-x7k2 ».
 * Le suffixe aléatoire évite les collisions et les adresses devinables.
 */
export function inboxLocalPart(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  const suffix = randomBytes(2).toString("hex");
  return `${slug || "accueil"}-${suffix}`;
}

/** Normalise une adresse email pour la recherche (`Accueil@In.Tando.fr` → minuscules). */
export function normalizeEmail(address: string): string {
  return address.trim().toLowerCase();
}
