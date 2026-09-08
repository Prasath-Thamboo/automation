import type { Config } from "tailwindcss";
import preset from "@tando/config/tailwind-preset";

const fallbackSans = ["Segoe UI", "system-ui", "-apple-system", "sans-serif"];

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
      fontFamily: {
        heading: ["var(--font-heading)", ...fallbackSans],
        body: ["var(--font-body)", ...fallbackSans],
      },
      maxWidth: {
        prose: "42rem",
        content: "64rem",
      },
    },
  },
  plugins: [],
};

export default config;
