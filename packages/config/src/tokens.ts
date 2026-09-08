/**
 * Tokens de design partagés web + mobile.
 * Aucune dépendance à un framework : objet TypeScript pur.
 * Le web les consomme via le preset Tailwind, le mobile via un thème React Native.
 *
 * Contraintes produit (voir §9.5 du cahier des charges) :
 * - corps de texte 16px minimum
 * - contrastes AA
 * - cibles tactiles 44px minimum
 * - métaphore de l'embauche : chaleureux, humain, jamais "tech"
 */

export const color = {
  // Neutres chauds (papier, encre)
  ink: {
    900: "#1c1a17",
    700: "#3d3a34",
    500: "#6b665c",
    300: "#a8a296",
    100: "#e7e3da",
    50: "#f6f3ec",
  },
  paper: "#fbf9f4",
  white: "#ffffff",

  // Primaire : vert "au travail" (calme, positif, non corporate)
  primary: {
    700: "#1f5c3d",
    600: "#26714b",
    500: "#2f8a5b",
    100: "#d8ece0",
    50: "#eef6f1",
  },

  // Accent : terracotta (chaleur humaine, CTA secondaires)
  accent: {
    600: "#b4531f",
    500: "#d06a30",
    100: "#f6e2d5",
  },

  // États
  success: "#26714b",
  warning: "#a9781a",
  danger: "#b23b3b",
  info: "#2c5f8a",
} as const;

/** Espacement en points (px web / dp mobile). Échelle de 4. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

/** Tailles de police en px. Le corps ne descend jamais sous 16. */
export const fontSize = {
  sm: 14, // réservé aux mentions légales / métadonnées
  base: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
  "4xl": 46,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const fontFamily = {
  /** Titres : humaniste, chaleureux. */
  heading: '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif',
  /** Corps : lisible, neutre. */
  body: '"Inter", "Segoe UI", system-ui, sans-serif',
} as const;

/** Cible tactile minimale (px / dp). */
export const minTouchTarget = 44;

export const tokens = {
  color,
  space,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
  minTouchTarget,
} as const;

export type Tokens = typeof tokens;
