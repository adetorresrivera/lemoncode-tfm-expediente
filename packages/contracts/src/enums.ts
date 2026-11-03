import { z } from "zod";

// Order of every option list follows docs/DOMAIN.md (lines 16-27); the UI
// relies on it for pipelines and selects.

export const applicationStatusSchema = z.enum([
  "guardada",
  "enviada",
  "en_entrevistas",
  "oferta_recibida",
  "aceptada",
  "rechazada",
  "descartada",
]);
export const workModeSchema = z.enum(["remoto", "hibrido", "presencial"]);
export const senioritySchema = z.enum(["junior", "mid", "senior", "lead"]);
export const contractTypeSchema = z.enum([
  "indefinido",
  "temporal",
  "freelance",
  "practicas",
  "otro",
]);
export const tagGroupSchema = z.enum(["stack", "nice_to_have", "language"]);
export const interviewTypeSchema = z.enum([
  "rrhh",
  "tecnica",
  "prueba_tecnica",
  "manager",
  "cultural",
  "otra",
]);
export const interviewModeSchema = z.enum(["online", "presencial", "telefono"]);
export const interviewOutcomeSchema = z.enum([
  "pendiente",
  "superada",
  "no_superada",
]);
export const documentTypeSchema = z.enum(["cv", "carta"]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type WorkMode = z.infer<typeof workModeSchema>;
export type Seniority = z.infer<typeof senioritySchema>;
export type ContractType = z.infer<typeof contractTypeSchema>;
export type TagGroup = z.infer<typeof tagGroupSchema>;
export type InterviewType = z.infer<typeof interviewTypeSchema>;
export type InterviewMode = z.infer<typeof interviewModeSchema>;
export type InterviewOutcome = z.infer<typeof interviewOutcomeSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;

/** States that end a process (docs/DOMAIN.md line 29). */
export const TERMINAL_STATUSES: readonly ApplicationStatus[] = [
  "aceptada",
  "rechazada",
  "descartada",
];
