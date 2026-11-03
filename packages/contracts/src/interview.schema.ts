import { z } from "zod";
import {
  interviewModeSchema,
  interviewOutcomeSchema,
  interviewTypeSchema,
} from "./enums.js";

export const interviewFieldsSchema = z.object({
  round: z.int().min(1),
  type: interviewTypeSchema,
  scheduledAt: z.iso.datetime().nullable().default(null),
  mode: interviewModeSchema,
  notes: z.string().trim().max(5000).nullable().default(null),
  outcome: interviewOutcomeSchema.default("pendiente"),
});

export const interviewSchema = interviewFieldsSchema.extend({
  id: z.string().min(1),
});

/** `round` is optional on input: the API assigns max + 1 when absent (INT-02). */
export const interviewInputSchema = interviewFieldsSchema.extend({
  round: z.int().min(1).optional(),
});

export type Interview = z.infer<typeof interviewSchema>;
export type InterviewInput = z.infer<typeof interviewInputSchema>;
