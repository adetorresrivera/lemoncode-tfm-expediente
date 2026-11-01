import { z } from "zod";
import type { LlmClient, LlmConfig } from "./llm.client.js";
import { callStructured } from "./structured-call.js";

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullish() }).optional(),
      }),
    )
    .optional(),
});

export function createOpenAiProvider(config: LlmConfig): LlmClient {
  const baseUrl = (config.LLM_BASE_URL ?? "").replace(/\/+$/, "");
  return {
    async extractStructured(system, input, schema, options) {
      // Some OpenAI-compatible vendors reject unknown top-level keywords.
      const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(
        options?.responseSchema ?? schema,
      );
      void _dialect;
      const body = JSON.stringify({
        model: config.LLM_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "offer_extraction",
            strict: true,
            schema: jsonSchema,
          },
        },
      });
      return callStructured({
        timeoutMs: config.LLM_TIMEOUT_MS,
        signal: options?.signal,
        schema,
        send: async (signal) => {
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.LLM_API_KEY ?? ""}`,
              "content-type": "application/json",
            },
            body,
            signal,
          });
          // callStructured maps this to a fixed 502; neither the key nor the upstream body travels.
          if (!res.ok) {
            throw new Error(
              "The model endpoint answered with a non-2xx status",
            );
          }
          const parsed = completionSchema.safeParse(await res.json());
          return parsed.success
            ? (parsed.data.choices?.[0]?.message?.content ?? null)
            : null;
        },
      });
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
