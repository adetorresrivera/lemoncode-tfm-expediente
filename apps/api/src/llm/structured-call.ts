import type { z } from "zod";

export async function callStructured<T>(args: {
  timeoutMs: number;
  signal?: AbortSignal;
  schema: z.ZodType<T>;
  send: (signal: AbortSignal) => Promise<string | null>;
}): Promise<T> {
  throw new Error(`not implemented (${args.timeoutMs})`);
}
