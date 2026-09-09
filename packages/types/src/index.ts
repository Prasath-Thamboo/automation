/**
 * Contrat de types partagé entre l'API, le web et le mobile.
 * La source de vérité, ce sont les schémas Zod : l'API valide avec, les clients
 * infèrent leurs types depuis. Aucune règle métier ici — uniquement des formes.
 */
export * from "./common";
export * from "./auth";
export * from "./health";
export * from "./catalog";
export * from "./quotes";
export * from "./billing";
export * from "./team";
