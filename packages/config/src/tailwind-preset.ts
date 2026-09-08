import type { Config } from "tailwindcss";
import { color, fontFamily, fontSize, radius, space } from "./tokens";

/**
 * Preset Tailwind partagé. `apps/web/tailwind.config.ts` l'étend.
 * Les valeurs viennent de tokens.ts — ne jamais redéfinir une couleur ici en dur.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        ink: color.ink,
        paper: color.paper,
        primary: color.primary,
        accent: color.accent,
        success: color.success,
        warning: color.warning,
        danger: color.danger,
        info: color.info,
      },
      fontFamily: {
        heading: fontFamily.heading.split(",").map((s) => s.trim().replace(/^"|"$/g, "")),
        body: fontFamily.body.split(",").map((s) => s.trim().replace(/^"|"$/g, "")),
      },
      fontSize: Object.fromEntries(
        Object.entries(fontSize).map(([k, v]) => [k, `${v / 16}rem`]),
      ),
      spacing: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, `${v}px`])),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([k, v]) => [k, typeof v === "number" ? `${v}px` : v]),
      ),
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
    },
  },
};

export default preset;
