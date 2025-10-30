import js from "@eslint/js";
import prettierPlugin from "eslint-plugin-prettier";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["dist/**", "node_modules/**", "coverage/**", "data-source.ts"],

    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        sourceType: "module",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
      prettier: prettierPlugin,
    },

    rules: {
      /* Regras TypeScript gerais */
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/explicit-member-accessibility": [
        "error",
        { accessibility: "no-public" },
      ],

      /* Regras de estilo NestJS idiomáticas */
      "class-methods-use-this": "off",
      "max-classes-per-file": ["warn", 2],
      "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "class", format: ["PascalCase"] },
        { selector: "interface", format: ["PascalCase"], prefix: ["I"] },
        { selector: "variable", format: ["camelCase", "UPPER_CASE"] },
      ],

      /* Prettier */
      "prettier/prettier": [
        "error",
        {
          printWidth: 100,
          singleQuote: true,
          trailingComma: "all",
          endOfLine: "auto",
        },
      ],
    },
  },
];