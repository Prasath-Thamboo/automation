/**
 * Thème React Native dérivé des tokens partagés (`@velekya/config/tokens`).
 * Les composants natifs (Lot 7+) consommeront ce thème ; aucune valeur de couleur
 * ou d'espacement ne doit être écrite en dur ailleurs.
 */
import { color, fontSize, radius, space, minTouchTarget } from "@velekya/config/tokens";

export const theme = {
  color: {
    ink: color.ink[900],
    inkSoft: color.ink[700],
    inkFaint: color.ink[500],
    paper: color.paper,
    white: color.white,
    /** Bleu nuit : navigation, contours, éléments actifs. */
    primary: color.primary[900],
    /** Texte d'accentuation (liens, libellés de boutons secondaires). */
    primaryStrong: color.primary[700],
    /** Bordeaux : boutons d'action et éléments graphiques, jamais du texte. */
    accent: color.accent[600],
    action: color.accent[600],
    actionPressed: color.accent[700],
    border: color.ink[100],
    borderStrong: color.ink[300],
    success: color.success,
    danger: color.danger,
    warning: color.warning,
    /** Mode sombre (charte §2). */
    darkBackground: color.dark.background,
    darkText: color.dark.text,
  },
  space,
  radius,
  fontSize,
  minTouchTarget,
} as const;

export type Theme = typeof theme;
