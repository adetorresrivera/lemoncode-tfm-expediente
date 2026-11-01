import type { z } from "zod";
import { ApiError } from "../errors.js";

const MAX_ATTEMPTS = 2;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // The caught error is dropped on purpose: its message can quote the model output.
    return undefined;
  }
}

/**
 * Runs `send` (one request to the model that resolves with the answer text)
 * under one total time budget. Unparseable or schema-invalid output is retried
 * once; transport failures and timeouts are not. Every error message is fixed:
 * none carries the key, the upstream body or any part of the model output.
 */
export async function callStructured<T>(args: {
  timeoutMs: number;
  signal?: AbortSignal;
  schema: z.ZodType<T>;
  send: (signal: AbortSignal) => Promise<string | null>;
}): Promise<T> {
  // One budget per call, shared by both attempts.
  const timeout = AbortSignal.timeout(args.timeoutMs);
  const signal = args.signal
    ? AbortSignal.any([timeout, args.signal])
    : timeout;

  // Decide by the signal we created, never by the shape or name of the rejection.
  const interrupted = () =>
    timeout.aborted
      ? new ApiError(504, "LLM_TIMEOUT", "La IA ha tardado demasiado")
      : new ApiError(502, "LLM_ERROR", "El modelo no está disponible");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal.aborted) throw interrupted();

    let text: string | null;
    try {
      text = await args.send(signal);
    } catch {
      throw interrupted();
    }

    if (text !== null) {
      const parsed = args.schema.safeParse(parseJson(text));
      if (parsed.success) return parsed.data;
    }
  }

  if (signal.aborted) throw interrupted();
  throw new ApiError(502, "LLM_ERROR", "La respuesta del modelo no es válida");
}
