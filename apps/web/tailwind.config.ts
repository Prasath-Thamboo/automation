import type { Config } from "tailwindcss";
import preset from "@velekya/config/tailwind-preset";

/**
 * Surcharges propres au web (le mobile garde les tokens de @velekya/config).
 *
 * Charte graphique v2.0 (`brand/`) : bleu nuit (principale), bordeaux (accent,
 * boutons et éléments graphiques — jamais du texte), blanc glacé (fond),
 * ardoise (texte). Titres en Poppins SemiBold, corps en Inter.
 *
 * Lisible par tous, y compris les patrons de plus de 60 ans :
 * - corps de texte 18px, jamais rien sous 16px (même `text-xs` / `text-sm`) ;
 * - contrastes AA minimum (ink-500 fait 5,4:1 sur blanc glacé) ;
 * - cibles tactiles 48px ;
 * - coins à 12px, ombres très légères (charte §5).
 */

const sans = ["Arial", "Segoe UI", "system-ui", "-apple-system", "Helvetica Neue", "sans-serif"];

const config: Config = {
  presets: [preset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111c27",
          900: "#1b2a38", // Ardoise
          800: "#263646",
          700: "#364757",
          600: "#46576a",
          500: "#56677a",
          400: "#7a8a9b",
          300: "#a8b5c2",
          200: "#d2dae2",
          100: "#e4eaef",
          50: "#eff3f6",
        },
        paper: "#f4f8f8", // Blanc glacé
        primary: {
          950: "#08131f",
          900: "#0f1f2e", // Bleu nuit
          800: "#172b3d",
          700: "#1f3a52",
          600: "#2b4d6b",
          500: "#4a6a88",
          300: "#9db3c7",
          200: "#c6d4e1",
          100: "#dfe8f0",
          50: "#eef3f7",
        },
        accent: {
          800: "#66132a",
          700: "#7e1832",
          600: "#9e1f3f", // Bordeaux
          500: "#b8345a",
          300: "#e3a3b4",
          200: "#f0c9d3",
          100: "#f8e4e9",
          50: "#fcf2f4",
        },
        success: { DEFAULT: "#15803d", solid: "#16a34a" }, // Vert validation
        warning: "#8a6212",
        danger: { DEFAULT: "#c22f35", solid: "#e5484d" }, // Rouge signal
        info: "#1f3a52",
      },
      fontFamily: {
        heading: ["Poppins", ...sans],
        body: ["Inter Variable", ...sans],
      },
      fontSize: {
        xs: ["1rem", { lineHeight: "1.4" }],
        sm: ["1rem", { lineHeight: "1.5" }],
        base: ["1.125rem", { lineHeight: "1.65" }],
        lg: ["1.25rem", { lineHeight: "1.6" }],
        xl: ["1.5rem", { lineHeight: "1.35" }],
        "2xl": ["1.875rem", { lineHeight: "1.2" }],
        "3xl": ["2.375rem", { lineHeight: "1.12" }],
        "4xl": ["3rem", { lineHeight: "1.06" }],
        "5xl": ["3.75rem", { lineHeight: "1.02" }],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      // Ombres à éviter (charte §5) : très légères, cartes uniquement.
      boxShadow: {
        soft: "0 1px 2px rgba(15,31,46,0.05)",
        card: "0 2px 8px -2px rgba(15,31,46,0.10)",
        lift: "0 4px 16px -6px rgba(15,31,46,0.14)",
        glow: "none",
      },
      minHeight: { touch: "48px" },
      minWidth: { touch: "48px" },
      maxWidth: {
        prose: "44rem",
        content: "76rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
