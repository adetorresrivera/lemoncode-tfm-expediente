import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "DOCUMENT_IN_USE",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FILE_TYPE",
  "LLM_ERROR",
  "LLM_TIMEOUT",
  "INTERNAL_ERROR",
]);

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const healthStatusSchema = z.enum(["ok", "error"]);

export const healthSchema = z.object({
  status: z.literal("ok"),
  mongo: healthStatusSchema,
  s3: healthStatusSchema,
  llm: healthStatusSchema,
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type Health = z.infer<typeof healthSchema>;
