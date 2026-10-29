import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plan 01-04 Task 2 appends the Tailwind plugin.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  resolve: {
    conditions: ["@tfm/source", "module", "browser", "development|production"],
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3000" } },
  },
});
