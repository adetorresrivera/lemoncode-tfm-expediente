import {
  applicationInputSchema,
  normalizeTags,
  tagKey,
  type Application,
  type ApplicationInput,
  type OfferExtraction,
} from "@tfm/contracts";
import { z } from "zod";
import {
  EMPTY_FORM_VALUES,
  RELEVANT_FIELDS,
  type AiFillableField,
  type ApplicationFormValues,
  type ExtractionMerge,
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

const pad = (value: number): string => String(value).padStart(2, "0");

// The calendar date of an instant in the user's time zone, the value of an <input type="date">
// (Pitfall 10). No instant, or one that is not a date, is an empty field.
export const toLocalDateInput = (iso: string | null): string => {
  if (iso === null) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// API model -> form values: null becomes "" and numbers become strings, so every control is
// controlled from the first render and optional fields stay blank.
export function mapApplicationFromApiToFormValues(
  application: Application,
): ApplicationFormValues {
  return {
    title: application.title,
    company: application.company,
    location: application.location ?? "",
    workMode: application.workMode ?? "",
    seniority: application.seniority ?? "",
    contractType: application.contractType ?? "",
    salaryMin:
      application.salaryMin === null ? "" : String(application.salaryMin),
    salaryMax:
      application.salaryMax === null ? "" : String(application.salaryMax),
    currency: application.currency ?? EMPTY_FORM_VALUES.currency,
    tags: application.tags.map((tag) => ({
      label: tag.label,
      group: tag.group,
    })),
    status: application.status,
    appliedAt: toLocalDateInput(application.appliedAt),
    sourceUrl: application.sourceUrl ?? "",
    notes: application.notes ?? "",
  };
}

// The form edits dates at day precision, but an automatic appliedAt (first move to enviada) is an
// exact instant. While the local date in the form still equals the local date of the stored
// instant, the stored instant goes back unchanged; a changed date stays local noon and a cleared
// date stays null (D-08). The input object is not mutated.
export function keepStoredAppliedAt(
  input: ApplicationInput,
  storedAppliedAt: string | null,
): ApplicationInput {
  if (input.appliedAt === null || storedAppliedAt === null) return input;
  return toLocalDateInput(input.appliedAt) === toLocalDateInput(storedAppliedAt)
    ? { ...input, appliedAt: storedAppliedAt }
    : input;
}

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

type MergedTextField =
  "title" | "company" | "location" | "workMode" | "seniority" | "contractType";

const isBlank = (text: string): boolean => text.trim() === "";

// Fills only what is empty (a whitespace-only value counts as empty) and only with a value the
// extraction found: a value the user typed is never overwritten (AI-06, D-04). Two refinements
// guard the salary: a fill never leaves the minimum above a maximum the user kept (Pitfall 9), and
// the currency is filled only together with a salary the analysis filled (Pitfall 10). Reports
// the relevant fields still empty after the merge (AI-08). Pure: `current` is not mutated.
export function mergeExtractionIntoForm(
  current: ApplicationFormValues,
  extraction: OfferExtraction,
): ExtractionMerge {
  const values: ApplicationFormValues = { ...current };
  const aiFields: AiFillableField[] = [];

  const fill = <F extends MergedTextField>(
    field: F,
    extracted: ApplicationFormValues[F] | null,
  ): void => {
    if (extracted === null || extracted.trim() === "") return;
    const existing: string = current[field];
    if (existing.trim() !== "") return;
    values[field] = extracted;
    aiFields.push(field);
  };

  fill("title", extraction.title);
  fill("company", extraction.company);
  fill("location", extraction.location);
  fill("workMode", extraction.workMode);
  fill("seniority", extraction.seniority);
  fill("contractType", extraction.contractType);

  const keptMin = isBlank(current.salaryMin) ? null : Number(current.salaryMin);
  const keptMax = isBlank(current.salaryMax) ? null : Number(current.salaryMax);

  // A fill that would leave the minimum above a maximum the user kept (or the maximum below a
  // minimum the user kept) is skipped: the AI never overwrites and never inverts the range.
  const minToFill =
    extraction.salaryMin !== null &&
    isBlank(current.salaryMin) &&
    !(keptMax !== null && extraction.salaryMin > keptMax)
      ? extraction.salaryMin
      : null;
  const maxToFill =
    extraction.salaryMax !== null &&
    isBlank(current.salaryMax) &&
    !(keptMin !== null && extraction.salaryMax < keptMin)
      ? extraction.salaryMax
      : null;

  if (minToFill !== null) {
    values.salaryMin = String(minToFill);
    aiFields.push("salaryMin");
  }
  if (maxToFill !== null) {
    values.salaryMax = String(maxToFill);
    aiFields.push("salaryMax");
  }

  const salaryWasEmpty =
    isBlank(current.salaryMin) && isBlank(current.salaryMax);
  if (
    salaryWasEmpty &&
    (minToFill !== null || maxToFill !== null) &&
    extraction.currency !== null
  ) {
    values.currency = extraction.currency;
    aiFields.push("currency");
  }

  // The user's tags come first and win on a repeated key (any group); the new ones follow in model
  // order and the cap keeps the user's tags (AI-06, D-04). The shared normalizer does the work.
  const mergedTags = normalizeTags([...current.tags, ...extraction.tags]);
  const currentKeys = new Set(current.tags.map((tag) => tagKey(tag.label)));
  const aiTags = mergedTags
    .map((tag) => tagKey(tag.label))
    .filter((key) => !currentKeys.has(key));
  values.tags = mergedTags.map((tag) => ({
    label: tag.label,
    group: tag.group,
  }));

  const missingFields = RELEVANT_FIELDS.filter((field) =>
    isBlank(values[field]),
  );

  return { values, aiFields, aiTags, missingFields };
}

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
