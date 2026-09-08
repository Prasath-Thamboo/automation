/**
 * Composants web partagés (landing, catalogue, espace client).
 * Le back-office peut aussi les utiliser. Le mobile a son propre `@tando/ui-native`.
 * Style : classes utilitaires nommées `tnd-*` (voir styles.css), pas de dépendance
 * à la config Tailwind de l'app hôte pour rester réutilisable.
 */
export { Button, type ButtonProps } from "./button";
export { Field, type FieldProps } from "./field";
export { Callout, type CalloutProps } from "./callout";
