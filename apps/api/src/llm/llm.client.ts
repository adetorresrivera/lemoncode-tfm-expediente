import type { z } from "zod";
import type { Config } from "../config.js";
import { createMockProvider } from "./mock.provider.js";
import { createOllamaProvider } from "./ollama.provider.js";
import { createOpenAiProvider } from "./openai.provider.js";

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
  // HTTP providers append their own path, so drop one trailing slash here.
  const normalized: LlmConfig = {
    ...config,
    LLM_BASE_URL: config.LLM_BASE_URL?.replace(/\/$/, ""),
  };
  switch (normalized.LLM_PROVIDER) {
    case "ollama":
      return createOllamaProvider(normalized);
    case "openai":
      return createOpenAiProvider(normalized);
    case "mock":
      return createMockProvider();
  }
}
