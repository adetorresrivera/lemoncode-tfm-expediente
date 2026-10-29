import { z } from "zod";
import {
  applicationStatusSchema,
  contractTypeSchema,
  senioritySchema,
  workModeSchema,
} from "./enums.js";
import { interviewSchema } from "./interview.schema.js";
import { MAX_TAGS, tagSchema } from "./tag.schema.js";

export const statusHistoryEntrySchema = z.object({
  status: applicationStatusSchema,
  at: z.iso.datetime(),
});

// Plain object on purpose: pick/omit/partial throw on refined schemas in
// Zod 4, so every refinement is applied LAST, on the derived schema.
export const applicationFieldsSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).nullable().default(null),
  workMode: workModeSchema.nullable().default(null),
  seniority: senioritySchema.nullable().default(null),
  contractType: contractTypeSchema.nullable().default(null),
  salaryMin: z.number().nonnegative().nullable().default(null),
  salaryMax: z.number().nonnegative().nullable().default(null),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .nullable()
    .default(null),
  tags: z.array(tagSchema).max(MAX_TAGS).default([]),
  // http/https only: a stored javascript: URL would become a clickable link.
  sourceUrl: z
    .url({ protocol: /^https?$/ })
    .nullable()
    .default(null),
  offerText: z.string().max(20000).nullable().default(null),
  appliedAt: z.iso.datetime().nullable().default(null),
  notes: z.string().trim().max(5000).nullable().default(null),
  cvDocumentId: z.string().min(1).nullable().default(null),
  coverLetterDocumentId: z.string().min(1).nullable().default(null),
});

const salaryOrder = (v: {
  salaryMin: number | null;
  salaryMax: number | null;
}) =>
  v.salaryMin === null || v.salaryMax === null || v.salaryMin <= v.salaryMax;

const salaryOrderIssue = {
  path: ["salaryMax"],
  error: "salaryMax debe ser >= salaryMin",
};

export const applicationInputSchema = applicationFieldsSchema
  .extend({ status: applicationStatusSchema.default("guardada") })
  .refine(salaryOrder, salaryOrderIssue);

export const applicationSchema = applicationFieldsSchema
  .extend({
    id: z.string().min(1),
    status: applicationStatusSchema,
    statusHistory: z.array(statusHistoryEntrySchema),
    interviews: z.array(interviewSchema),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    ownerId: z.string().nullable(), // always null in the MVP
  })
  .refine(salaryOrder, salaryOrderIssue);

export const statusChangeSchema = z.strictObject({
  status: applicationStatusSchema,
});

// Query strings carry one value as a scalar and several as a repeated key.
const multi = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]),
    z.array(item).optional(),
  );

export const applicationQuerySchema = z.object({
  status: multi(applicationStatusSchema),
  tags: multi(z.string().min(1)),
  workMode: workModeSchema.optional(),
  seniority: senioritySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sort: z.enum(["updatedAt", "appliedAt"]).default("updatedAt"),
});

export type StatusHistoryEntry = z.infer<typeof statusHistoryEntrySchema>;
export type Application = z.infer<typeof applicationSchema>;
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;
export type StatusChange = z.infer<typeof statusChangeSchema>;
