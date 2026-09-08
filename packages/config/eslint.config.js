import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Config ESLint plate partagée. Chaque app/package fait :
 *   import base from "@tando/config/eslint";
 *   export default [...base, { ...surcharges }];
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/build/**", "**/node_modules/**", "**/*.config.*"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);
