import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    conditions: ["@tfm/source", "module", "browser", "development|production"],
    tsconfigPaths: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3000" } },
  },
});
