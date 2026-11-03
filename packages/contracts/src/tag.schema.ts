import { z } from "zod";
import { tagGroupSchema } from "./enums.js";

export const MAX_TAGS = 20;

export const tagSchema = z.object({
  label: z.string().trim().min(1).max(40),
  group: tagGroupSchema,
});

/** Item of GET /api/tags: a tag plus how many applications use it. */
export const tagSummarySchema = tagSchema.extend({
  count: z.int().min(0),
});

export type Tag = z.infer<typeof tagSchema>;
export type TagSummary = z.infer<typeof tagSummarySchema>;
