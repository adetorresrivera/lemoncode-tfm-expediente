import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plan 01-04 prepends the TanStack Router plugin and appends the Tailwind plugin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["@tfm/source", "module", "browser", "development|production"],
    tsconfigPaths: true,
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3000" } },
  },
});
