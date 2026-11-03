import { z } from "zod";
import {
  contractTypeSchema,
  senioritySchema,
  workModeSchema,
} from "./enums.js";
import { MAX_TAGS, tagSchema } from "./tag.schema.js";

/** Draft proposed by the LLM (docs/AI-EXTRACTION.md). Never persisted as is. */
export const offerExtractionSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  workMode: workModeSchema.nullable(),
  seniority: senioritySchema.nullable(),
  contractType: contractTypeSchema.nullable(),
  salaryMin: z.number().nonnegative().nullable(),
  salaryMax: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  tags: z.array(tagSchema).max(MAX_TAGS),
});

/** Body of POST /api/offers/extract (AI-01). */
export const offerExtractRequestSchema = z.object({
  text: z.string().trim().min(50).max(20000),
});

export type OfferExtraction = z.infer<typeof offerExtractionSchema>;
export type OfferExtractRequest = z.infer<typeof offerExtractRequestSchema>;
