import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["@tfm/source", "module", "browser", "development|production"],
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // CSS is not processed in tests, except the raw import of the theme file that
    // common/lib/contrast.test.ts reads to prove the AA contrast of the tokens.
    css: { include: [/styles\.css\?raw$/] },
  },
});
