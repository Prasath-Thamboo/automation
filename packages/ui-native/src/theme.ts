/**
 * Thème React Native dérivé des tokens partagés (`@tando/config/tokens`).
 * Les composants natifs (Lot 7+) consommeront ce thème ; aucune valeur de couleur
 * ou d'espacement ne doit être écrite en dur ailleurs.
 */
import { color, fontSize, radius, space, minTouchTarget } from "@tando/config/tokens";

export const theme = {
  color: {
    ink: color.ink[900],
    inkSoft: color.ink[700],
    inkFaint: color.ink[500],
    paper: color.paper,
    white: color.white,
    primary: color.primary[600],
    primaryStrong: color.primary[700],
    accent: color.accent[500],
    danger: color.danger,
    warning: color.warning,
  },
  space,
  radius,
  fontSize,
  minTouchTarget,
} as const;

export type Theme = typeof theme;
