import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { initTheme } from "@/core/theme/theme";
import "./styles.css";

initTheme();

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
