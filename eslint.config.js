import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "apps/web/src/routeTree.gen.ts",
    ".claude/**",
    ".planning/**",
    "gsd/**",
    ".devcontainer/**",
    "docs/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    // shadcn/ui generated components export variants next to components.
    files: ["apps/web/src/common/components/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // TanStack file routes export `Route` next to their component.
    files: ["apps/web/src/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowExportNames: ["Route"] },
      ],
    },
  },
  {
    files: [
      "apps/api/**/*.ts",
      "packages/**/*.ts",
      "*.config.{js,ts}",
      "apps/*/*.config.ts",
    ],
    languageOptions: { globals: globals.node },
  },
]);
