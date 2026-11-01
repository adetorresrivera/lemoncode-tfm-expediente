import {
  normalizeTagLabel,
  normalizeTags,
  offerExtractionSchema,
  type OfferExtraction,
} from "@tfm/contracts";
import { ApiError } from "../errors.js";
import type { LlmCallOptions, LlmClient } from "../llm/llm.client.js";

// Literal copy of the fenced block under «Prompt de sistema» in docs/AI-EXTRACTION.md (D-25).
// extract.routes.test.ts compares it with the document: edit both together, with approval.
export const EXTRACTION_SYSTEM_PROMPT = [
  "Eres un extractor de datos de ofertas de empleo en español o inglés.",
  "Devuelve solo los campos del esquema. Reglas:",
  "- Si un dato no aparece explícitamente en el texto, usa null. No inventes ni deduzcas empresa ni salario.",
  "- title: el nombre del puesto tal como aparece, sin la empresa.",
  '- salaryMin/salaryMax: salario anual bruto como número sin símbolos ni separadores. Si se da un único valor, ponlo en ambos. Si es mensual, multiplícalo por 12. "45-55k" → 45000 y 55000.',
  '- currency: código ISO 4217 (EUR, USD, GBP). Si hay "€", EUR.',
  '- workMode: remoto, hibrido o presencial. "Teletrabajo 100%" → remoto.',
  "- seniority: junior (0-2 años), mid (2-5), senior (5+), lead (liderazgo de equipo).",
  "- contractType: indefinido, temporal, freelance, practicas u otro.",
  "- tags:",
  "  - stack: tecnologías, lenguajes, frameworks, cloud y herramientas requeridas.",
  '  - nice_to_have: lo que la oferta marca como "se valora", "plus", "deseable".',
  '  - language: idiomas con nivel si aparece ("Inglés B2").',
  "  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.",
].join("\n");

const MAX_LABEL_UNITS = 40;

function clean(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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
export function normalizeExtraction(raw: OfferExtraction): OfferExtraction {
  let { salaryMin, salaryMax } = raw;
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
    currency: currency === null ? null : currency.toUpperCase(),
    tags: normalizeTags(
      raw.tags.map((tag) => ({
        label: cutLabel(normalizeTagLabel(tag.label)),
        group: tag.group,
      })),
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
          offerExtractionSchema,
          { signal: options?.signal },
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
