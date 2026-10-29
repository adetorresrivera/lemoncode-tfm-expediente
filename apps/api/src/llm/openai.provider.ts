import { ApiError } from "../errors.js";
import type { LlmClient, LlmConfig } from "./llm.client.js";

export function createOpenAiProvider(config: LlmConfig): LlmClient {
  const baseUrl = (config.LLM_BASE_URL ?? "").replace(/\/+$/, "");
  return {
    async extractStructured() {
      // Phase 3 implements chat/completions (AI-02). The key never appears in errors.
      throw new ApiError(502, "LLM_ERROR", "Extracción no disponible todavía");
    },
    async ping() {
      try {
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${config.LLM_API_KEY ?? ""}` },
          signal: AbortSignal.timeout(2000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
