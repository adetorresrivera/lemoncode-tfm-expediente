import {
  MAX_TAGS,
  normalizeTagLabel,
  normalizeTags,
  offerExtractionSchema,
  tagGroupSchema,
  tagSchema,
  type OfferExtraction,
  type TagGroup,
} from "@tfm/contracts";
import { z } from "zod";
import { ApiError } from "../errors.js";
import type { LlmCallOptions, LlmClient } from "../llm/llm.client.js";

// Literal copy of the fenced block under «Prompt de sistema» in docs/AI-EXTRACTION.md (D-25).
// extract.routes.test.ts compares it with the document: edit both together, with approval.
// The language item reads «idioma» since the user's approval of 2026-11-01 (UAT G-03-2).
export const EXTRACTION_SYSTEM_PROMPT = [
  "Eres un extractor de datos de ofertas de empleo en español o inglés.",
  "Devuelve solo los campos del esquema. Reglas:",
  "- Si un dato no aparece explícitamente en el texto, usa null. No inventes ni deduzcas empresa ni salario.",
  "- title: el nombre del puesto tal como aparece, sin la empresa.",
  "- company: la empresa que publica la oferta.",
  '- salaryMin/salaryMax: salario anual bruto como número sin símbolos ni separadores. Si se da un único valor, ponlo en ambos. Si es mensual, multiplícalo por 12. "45-55k" → 45000 y 55000.',
  '- currency: código ISO 4217 (EUR, USD, GBP). Si hay "€", EUR.',
  '- workMode: remoto, hibrido o presencial. "Teletrabajo 100%" → remoto.',
  "- seniority: junior (0-2 años), mid (2-5), senior (5+), lead (liderazgo de equipo).",
  "- contractType: indefinido, temporal, freelance, practicas u otro.",
  "- tags:",
  "  - stack: tecnologías, lenguajes, frameworks, cloud y herramientas requeridas.",
  '  - nice_to_have: lo que la oferta marca como "se valora", "plus", "deseable".',
  '  - idioma: idiomas con nivel si aparece ("Inglés B2").',
  '  - label es el nombre de la tecnología o idioma (p. ej. "React", "Inglés B2"), nunca el nombre del grupo.',
  "  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.",
].join("\n");

const MAX_LABEL_UNITS = 40;

// What the pipeline accepts from the model before normalizing. The model is shown
// modelOfferExtractionSchema (D-01); this one only decides what is usable once it answers, so
// an over-long label, a 21st tag, an empty label or a free-form currency is normalized
// instead of failing the whole analysis. It also accepts the alias «idioma» besides every
// contract group. It is not an API model: nothing leaves the API with it.
export const rawOfferExtractionSchema = offerExtractionSchema.extend({
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  currency: z.string().nullable(),
  tags: z.array(
    z.object({
      label: z.string(),
      group: z.enum([...tagGroupSchema.options, "idioma"]),
    }),
  ),
});

export const MODEL_TAG_GROUPS = ["stack", "nice_to_have", "idioma"] as const;

// Provider-facing only: shown to the model through LlmCallOptions.responseSchema. It never
// parses an answer and never leaves the API. The model reads the English «language» as
// programming language (UAT G-03-2), so it sees «idioma», which the raw parse maps back.
export const modelOfferExtractionSchema = offerExtractionSchema.extend({
  tags: z
    .array(tagSchema.extend({ group: z.enum(MODEL_TAG_GROUPS) }))
    .max(MAX_TAGS),
});

export type RawOfferExtraction = z.infer<typeof rawOfferExtractionSchema>;

// Spoken languages a «language» tag may name (UAT G-03-2, D-26): lower-case, no accents,
// compared against whole words of the label.
export const SPOKEN_LANGUAGE_WORDS: ReadonlySet<string> = new Set([
  "ingles",
  "english",
  "espanol",
  "spanish",
  "castellano",
  "frances",
  "french",
  "aleman",
  "german",
  "italiano",
  "italian",
  "portugues",
  "portuguese",
  "catalan",
  "catala",
  "euskera",
  "gallego",
  "valenciano",
  "neerlandes",
  "holandes",
  "dutch",
  "chino",
  "mandarin",
  "chinese",
  "japones",
  "japanese",
  "arabe",
  "arabic",
  "ruso",
  "russian",
  "polaco",
  "polish",
  "sueco",
  "swedish",
  "bilingue",
]);

// Whole-word match on the label without accents and in lower case, never a substring.
export function isSpokenLanguageLabel(label: string): boolean {
  const words = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u);
  return words.some((word) => SPOKEN_LANGUAGE_WORDS.has(word));
}

// «language» and its model-facing alias «idioma» are kept only for spoken languages;
// anything else (C, Python, Java…) belongs in «stack». One direction only (D-26).
function resolveTagGroup(
  label: string,
  group: RawOfferExtraction["tags"][number]["group"],
): TagGroup {
  if (group === "language" || group === "idioma") {
    return isSpokenLanguageLabel(label) ? "language" : "stack";
  }
  return group;
}

const CURRENCY_CODE = /^[A-Z]{3}$/;

function clean(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toCurrencyCode(value: string | null): string | null {
  if (value === null) return null;
  const code = value.toUpperCase();
  return CURRENCY_CODE.test(code) ? code : null;
}

// Keeps the first 40 UTF-16 code units (what tagSchema counts) and never ends on a lone high surrogate.
function cutLabel(label: string): string {
  if (label.length <= MAX_LABEL_UNITS) return label;
  let cut = label.slice(0, MAX_LABEL_UNITS);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut.trim();
}

// Pure: builds a new object and never mutates its input (docs/AI-EXTRACTION.md §Normalización).
export function normalizeExtraction(raw: RawOfferExtraction): OfferExtraction {
  let salaryMin =
    raw.salaryMin !== null && raw.salaryMin >= 0 ? raw.salaryMin : null;
  let salaryMax =
    raw.salaryMax !== null && raw.salaryMax >= 0 ? raw.salaryMax : null;
  if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }
  const currency = clean(raw.currency);
  const result: OfferExtraction = {
    title: clean(raw.title),
    company: clean(raw.company),
    location: clean(raw.location),
    workMode: raw.workMode,
    seniority: raw.seniority,
    contractType: raw.contractType,
    salaryMin,
    salaryMax,
    // A value that is not an ISO 4217-shaped code (for example "€") is dropped, not guessed.
    currency: toCurrencyCode(currency),
    tags: normalizeTags(
      raw.tags.map((tag) => {
        const label = cutLabel(normalizeTagLabel(tag.label));
        return { label, group: resolveTagGroup(label, tag.group) };
      }),
    ),
  };
  const parsed = offerExtractionSchema.safeParse(result);
  if (!parsed.success) {
    throw new ApiError(
      502,
      "LLM_ERROR",
      "La respuesta del modelo no es válida",
    );
  }
  return parsed.data;
}

export interface ExtractService {
  extract(text: string, options?: LlmCallOptions): Promise<OfferExtraction>;
}

// The only log line carries the text length and the duration: never the offer or the model output (D-02).
export function createExtractService(llm: LlmClient): ExtractService {
  return {
    async extract(text, options) {
      const started = performance.now();
      try {
        const raw = await llm.extractStructured(
          EXTRACTION_SYSTEM_PROMPT,
          text,
          rawOfferExtractionSchema,
          {
            signal: options?.signal,
            responseSchema: modelOfferExtractionSchema,
          },
        );
        return normalizeExtraction(raw);
      } finally {
        console.info("offers.extract", {
          length: text.length,
          durationMs: Math.round(performance.now() - started),
        });
      }
    },
  };
}
