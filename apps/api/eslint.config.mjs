import base from "@tando/config/eslint";

export default [
  ...base,
  {
    rules: {
      // NestJS s'appuie sur les décorateurs + emitDecoratorMetadata : un import
      // "utilisé seulement comme type" (ex. un service injecté dans un constructeur)
      // doit rester un import de valeur, sinon l'injection casse à l'exécution.
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];
