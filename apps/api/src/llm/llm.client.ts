import type { z } from "zod";
import type { Config } from "../config.js";
import { createOllamaProvider } from "./ollama.provider.js";

export interface LlmClient {
  extractStructured<T>(
    system: string,
    input: string,
    schema: z.ZodType<T>,
  ): Promise<T>;
  ping(): Promise<boolean>; // used by /api/health
}

export type LlmConfig = Pick<
  Config,
  | "LLM_PROVIDER"
  | "LLM_BASE_URL"
  | "LLM_MODEL"
  | "LLM_API_KEY"
  | "LLM_TIMEOUT_MS"
>;

export function createLlmClient(config: LlmConfig): LlmClient {
  switch (config.LLM_PROVIDER) {
    case "ollama":
      return createOllamaProvider(config);
    case "openai":
    case "mock":
      // Plan 01-03 fills these providers together with the offer-extraction contract.
      throw new Error(
        `LLM provider ${config.LLM_PROVIDER} is wired in plan 01-03`,
      );
  }
}
