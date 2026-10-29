import { ApiError } from "../errors.js";
import type { LlmClient, LlmConfig } from "./llm.client.js";

export function createOllamaProvider(config: LlmConfig): LlmClient {
  const baseUrl = (config.LLM_BASE_URL ?? "").replace(/\/+$/, "");
  return {
    async extractStructured() {
      // Phase 3 implements the real call (AI-01, AI-02).
      throw new ApiError(502, "LLM_ERROR", "Extracción no disponible todavía");
    },
    async ping() {
      try {
        const res = await fetch(`${baseUrl}/api/version`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
