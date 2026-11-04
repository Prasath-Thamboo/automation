import type { Config } from "tailwindcss";
import preset from "@tando/config/tailwind-preset";

/**
 * Surcharges propres au web (le mobile garde les tokens de @tando/config).
 *
 * Parti pris : moderne et chaleureux, mais lisible par tous — y compris les
 * patrons de plus de 60 ans.
 * - corps de texte 18px, jamais rien sous 16px (même `text-xs` / `text-sm`) ;
 * - contrastes AA minimum (le gris le plus clair utilisé pour du texte, ink-500,
 *   fait 6:1 sur blanc) ;
 * - cibles tactiles 48px ;
 * - police de corps Atkinson Hyperlegible Next (dessinée pour les lecteurs
 *   malvoyants), titres en Bricolage Grotesque. Toutes deux auto-hébergées.
 */

const sans = ["Segoe UI", "system-ui", "-apple-system", "Helvetica Neue", "Arial", "sans-serif"];

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
          950: "#101418",
          900: "#171c22",
          700: "#363e48",
          500: "#56606d",
          400: "#7d8692",
          300: "#a5adb8",
          200: "#d3d8df",
          100: "#e6e9ee",
          50: "#f3f5f7",
        },
        paper: "#f8f6f1",
        primary: {
          900: "#0d3a28",
          800: "#104a33",
          700: "#145c3f",
          600: "#18744f",
          500: "#1f9163",
          300: "#7fd0a9",
          200: "#b7e6cd",
          100: "#d8f2e4",
          50: "#edf9f2",
        },
        accent: {
          700: "#97391a",
          600: "#b4461a",
          500: "#e36a2e",
          200: "#fbcdb1",
          100: "#fde7d9",
          50: "#fff5ee",
        },
        sun: {
          400: "#f6c445",
          100: "#fdf1c9",
        },
        success: "#18744f",
        warning: "#8a6212",
        danger: "#b3261e",
        info: "#1f5f99",
      },
      fontFamily: {
        heading: ["Bricolage Grotesque Variable", ...sans],
        body: ["Atkinson Hyperlegible Next Variable", ...sans],
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
        lg: "20px",
        xl: "28px",
        "2xl": "36px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,20,24,0.04), 0 4px 16px -4px rgba(16,20,24,0.08)",
        card: "0 1px 2px rgba(16,20,24,0.05), 0 12px 32px -12px rgba(16,20,24,0.16)",
        lift: "0 2px 4px rgba(16,20,24,0.06), 0 24px 48px -16px rgba(16,20,24,0.22)",
        glow: "0 12px 32px -8px rgba(24,116,79,0.45)",
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
