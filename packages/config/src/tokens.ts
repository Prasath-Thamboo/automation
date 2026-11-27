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
 * - charte graphique v2.0 : brand/Charte graphique Velekya, version 2.0.pdf
 */

export const color = {
  // Charte graphique v2.0 (brand/). Neutres froids autour de l'ardoise #1B2A38.
  ink: {
    900: "#1b2a38", // Ardoise — texte courant
    700: "#364757",
    500: "#56677a",
    300: "#a8b5c2",
    100: "#e4eaef",
    50: "#eff3f6",
  },
  paper: "#f4f8f8", // Blanc glacé — fond des pages et des écrans
  white: "#ffffff",

  // Principale : bleu nuit (titres, navigation, fonds sombres, liens).
  primary: {
    900: "#0f1f2e", // Bleu nuit
    700: "#1f3a52",
    600: "#2b4d6b",
    500: "#4a6a88",
    100: "#dfe8f0",
    50: "#eef3f7",
  },

  // Accent : bordeaux. Boutons d'action et éléments graphiques uniquement —
  // jamais comme couleur de texte (charte §2).
  accent: {
    700: "#7e1832",
    600: "#9e1f3f", // Bordeaux
    500: "#b8345a",
    100: "#f8e4e9",
  },

  // États. Les teintes de la charte (#16A34A, #E5484D) n'atteignent pas 4,5:1
  // sur blanc glacé : elles servent aux pastilles / icônes (`*Solid`), le
  // texte utilise une teinte plus soutenue.
  success: "#15803d",
  successSolid: "#16a34a", // Vert validation
  warning: "#8a6212",
  danger: "#c22f35",
  dangerSolid: "#e5484d", // Rouge signal
  info: "#1f3a52",

  // Mode sombre de l'application (charte §2).
  dark: {
    background: "#08131f",
    text: "#f4f8f8",
  },
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

/** Coins : boutons et cartes à 12 px (charte §5). */
export const radius = {
  sm: 6,
  md: 12,
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
  /** Titres et logotype : Poppins SemiBold (charte §4). */
  heading: '"Poppins", Arial, system-ui, sans-serif',
  /** Corps : Inter 400 / 500 (charte §4). */
  body: '"Inter", Arial, system-ui, sans-serif',
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
