import { z } from "zod";
import { documentTypeSchema } from "./enums.js";

export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const documentSchema = z.object({
  id: z.string().min(1),
  type: documentTypeSchema,
  name: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  // The name of the uploaded file as the user knew it (accents kept): the download uses it.
  fileName: z.string().min(1).max(255),
  s3Key: z.string().min(1),
  mimeType: z.enum(DOCUMENT_MIME_TYPES),
  size: z.int().min(1).max(DOCUMENT_MAX_BYTES),
  createdAt: z.iso.datetime(),
});

// usedBy counts the applications whose cvDocumentId or coverLetterDocumentId point to the
// document (D-08): the library list needs it to warn before a delete.
export const documentListItemSchema = documentSchema.extend({
  usedBy: z.int().min(0),
});

/** Text fields of the multipart POST /api/documents (the file travels apart). */
export const documentInputSchema = z.object({
  type: documentTypeSchema,
  name: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
});

export const documentQuerySchema = z.object({
  type: documentTypeSchema.optional(),
});

export type Document = z.infer<typeof documentSchema>;
export type DocumentListItem = z.infer<typeof documentListItemSchema>;
export type DocumentInput = z.infer<typeof documentInputSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
