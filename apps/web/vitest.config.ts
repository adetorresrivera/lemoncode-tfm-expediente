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
    css: false,
  },
});
