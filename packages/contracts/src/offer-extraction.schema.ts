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

/** Bounds of the offer text, in JavaScript string length (UTF-16 code units): API and web share them. */
export const OFFER_TEXT_MIN = 50;
export const OFFER_TEXT_MAX = 20000;

/** Body of POST /api/offers/extract (AI-01). */
export const offerExtractRequestSchema = z.object({
  text: z.string().trim().min(OFFER_TEXT_MIN).max(OFFER_TEXT_MAX),
});

export type OfferExtraction = z.infer<typeof offerExtractionSchema>;
export type OfferExtractRequest = z.infer<typeof offerExtractRequestSchema>;
