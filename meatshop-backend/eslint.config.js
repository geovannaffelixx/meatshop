import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
    languageOptions: {
      parser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
      globals: {
        process: "readonly",   
        module: "readonly",    
        describe: "readonly",  
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly"
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/explicit-module-boundary-types": "off"
    }
  }
];
