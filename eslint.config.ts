import tseslint from "typescript-eslint";
import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  // svelte.configs.all,
  {
    ignores: [
      "node_modules",
      "dist",
      "main.js",
      "esbuild.config.mjs",
      "eslint.config.ts",
      "version-bump.mjs",
      "versions.json",
      ".obsidian",
    ],
  }, {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
]);
