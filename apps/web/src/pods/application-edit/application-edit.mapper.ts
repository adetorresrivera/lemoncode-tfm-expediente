import { applicationInputSchema } from "@tfm/contracts";
import { z } from "zod";
import {
  EMPTY_FORM_VALUES,
  type ApplicationFormValues,
  type FormFieldName,
} from "./application-edit.vm";

type ApplicationDraft = z.input<typeof applicationInputSchema>;
type FieldMessages = Partial<Record<FormFieldName, string>>;

const GENERIC_FIELD_MESSAGE = "Revisa este campo.";

const isFormFieldName = (key: unknown): key is FormFieldName =>
  typeof key === "string" && Object.hasOwn(EMPTY_FORM_VALUES, key);

// Empty (or whitespace-only) text is "no value" for the API. The schema does not do this itself:
// `sourceUrl: ""` and `currency: ""` would fail their own validation (Pitfall 9).
const textOrNull = (text: string): string | null =>
  text.trim() === "" ? null : text;

// "" is no salary, anything else goes through Number: "abc" becomes NaN on purpose, so the schema
// reports a number error instead of the mapper swallowing the input.
const amountOrNull = (text: string): number | null =>
  text.trim() === "" ? null : Number(text);

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Local noon survives DST and time-zone display of the stored instant; only the date is shown
// (Pitfall 10). An empty or impossible calendar date has no instant.
export const toLocalNoonIso = (date: string): string | null => {
  const match = DATE_PATTERN.exec(date);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const local = new Date(year, month - 1, day, 12);
  const sameDay =
    local.getFullYear() === year &&
    local.getMonth() === month - 1 &&
    local.getDate() === day;
  return sameDay ? local.toISOString() : null;
};

export const mapFormValuesToApiInput = (
  values: ApplicationFormValues,
): ApplicationDraft => {
  const salaryMin = amountOrNull(values.salaryMin);
  const salaryMax = amountOrNull(values.salaryMax);
  const hasSalary = salaryMin !== null || salaryMax !== null;
  return {
    title: values.title,
    company: values.company,
    location: textOrNull(values.location),
    workMode: values.workMode === "" ? null : values.workMode,
    seniority: values.seniority === "" ? null : values.seniority,
    contractType: values.contractType === "" ? null : values.contractType,
    salaryMin,
    salaryMax,
    currency: hasSalary ? textOrNull(values.currency) : null,
    tags: values.tags.map((tag) => ({ label: tag.label, group: tag.group })),
    status: values.status,
    // A date the calendar cannot produce goes through as typed, so the schema reports it.
    appliedAt:
      values.appliedAt === ""
        ? null
        : (toLocalNoonIso(values.appliedAt) ?? values.appliedAt),
    sourceUrl: textOrNull(values.sourceUrl.trim()),
    notes: textOrNull(values.notes),
    // No inputs for these in Phase 2: Phase 3 adds the paste panel, Phase 5 the documents.
    offerText: null,
    cvDocumentId: null,
    coverLetterDocumentId: null,
  };
};

const isEmptyInput = (issue: z.core.$ZodIssue): boolean =>
  typeof issue.input === "string" && issue.input.trim() === "";

// Spanish copy for one contracts issue, chosen by `path[0]` and `code` (UI-SPEC validation table).
// The contracts keep their own messages; the web owns the wording.
export const issueToMessage = (issue: z.core.$ZodIssue): string => {
  const [field, , nested] = issue.path;
  switch (field) {
    case "title":
      if (issue.code === "too_small") {
        return isEmptyInput(issue)
          ? "Escribe el puesto."
          : "El puesto necesita al menos 2 caracteres.";
      }
      if (issue.code === "too_big") {
        return "El puesto admite hasta 120 caracteres.";
      }
      break;
    case "company":
      if (issue.code === "too_small") return "Escribe la empresa.";
      if (issue.code === "too_big") {
        return "La empresa admite hasta 120 caracteres.";
      }
      break;
    case "location":
      if (issue.code === "too_big") {
        return "La ubicación admite hasta 120 caracteres.";
      }
      break;
    case "salaryMin":
    case "salaryMax":
      if (issue.code === "too_small")
        return "El salario no puede ser negativo.";
      if (issue.code === "invalid_type")
        return "Introduce un importe en números.";
      if (issue.code === "custom" && field === "salaryMax") {
        return "El máximo no puede ser menor que el mínimo.";
      }
      break;
    case "currency":
      if (issue.code === "invalid_format") {
        return "Usa un código de tres letras, por ejemplo EUR.";
      }
      break;
    case "sourceUrl":
      return "Introduce una dirección válida que empiece por http:// o https://.";
    case "appliedAt":
      return "Introduce una fecha válida.";
    case "notes":
      if (issue.code === "too_big") {
        return "Las notas admiten hasta 5.000 caracteres.";
      }
      break;
    case "tags":
      if (issue.code === "too_big") {
        return nested === "label"
          ? "Cada etiqueta admite hasta 40 caracteres."
          : "Máximo 20 etiquetas.";
      }
      break;
  }
  return GENERIC_FIELD_MESSAGE;
};

// Wraps the contracts schema for TanStack Form: the form holds strings, so the values are mapped
// to the API draft first. Returns the first message per field, or undefined when valid.
export const validateApplicationForm = (
  values: ApplicationFormValues,
): { fields: FieldMessages } | undefined => {
  const result = applicationInputSchema.safeParse(
    mapFormValuesToApiInput(values),
    { reportInput: true },
  );
  if (result.success) return undefined;
  const fields: FieldMessages = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isFormFieldName(field) && fields[field] === undefined) {
      fields[field] = issueToMessage(issue);
    }
  }
  return { fields };
};

const serverDetailsSchema = z.object({
  fieldErrors: z.record(z.string(), z.array(z.string())),
});

// A 400 carries `z.flattenError` details. Only the field names are used: the shown text is fixed,
// never the server's or the submitted value (T-02-25).
export const mapServerErrorToFields = (details: unknown): FieldMessages => {
  const parsed = serverDetailsSchema.safeParse(details);
  if (!parsed.success) return {};
  const fields: FieldMessages = {};
  for (const key of Object.keys(parsed.data.fieldErrors)) {
    if (isFormFieldName(key)) fields[key] = GENERIC_FIELD_MESSAGE;
  }
  return fields;
};
