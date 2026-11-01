import { z } from "zod";
import type { LlmClient, LlmConfig } from "./llm.client.js";
import { callStructured } from "./structured-call.js";

const chatResponseSchema = z.object({
  message: z.object({ content: z.string().nullish() }).optional(),
});

export function createOllamaProvider(config: LlmConfig): LlmClient {
  const baseUrl = (config.LLM_BASE_URL ?? "").replace(/\/+$/, "");
  return {
    async extractStructured(system, input, schema, options) {
      const body = JSON.stringify({
        model: config.LLM_MODEL,
        stream: false,
        think: false, // gemma4:e2b reports the thinking capability; keep it off
        // num_ctx 8192: Ollama defaults to a small window and truncates long offers silently.
        options: { temperature: 0, num_ctx: 8192 },
        format: z.toJSONSchema(options?.responseSchema ?? schema),
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      });
      return callStructured({
        timeoutMs: config.LLM_TIMEOUT_MS,
        signal: options?.signal,
        schema,
        send: async (signal) => {
          const res = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            signal,
          });
          // callStructured maps this to a fixed 502; the upstream body is never read.
          if (!res.ok) throw new Error("Ollama answered with a non-2xx status");
          const parsed = chatResponseSchema.safeParse(await res.json());
          return parsed.success ? (parsed.data.message?.content ?? null) : null;
        },
      });
    },
    async ping() {
      try {
        const res = await fetch(`${baseUrl}/api/version`, {
          signal: AbortSignal.timeout(2000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
