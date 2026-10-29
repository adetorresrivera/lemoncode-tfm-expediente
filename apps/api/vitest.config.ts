import { defineConfig } from "vitest/config";

// @tfm/contracts is a symlinked workspace package: Vitest externalises it and Node resolves it,
// so the source condition must be set for both the bundler and the externalised resolution.
export default defineConfig({
  ssr: {
    resolve: {
      conditions: ["@tfm/source"],
      externalConditions: ["@tfm/source"],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
