import { offerExtractionSchema, type OfferExtraction } from "@tfm/contracts";
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

// RED stub (plan 03-03): replaced by the real normalization in the GREEN commit.
export function normalizeExtraction(raw: OfferExtraction): OfferExtraction {
  throw new Error(`not implemented: ${typeof raw}`);
}

export interface ExtractService {
  extract(text: string, options?: LlmCallOptions): Promise<OfferExtraction>;
}

// Never logs: the offer text must not reach the logs (plan 03-03 adds length and duration only).
export function createExtractService(llm: LlmClient): ExtractService {
  return {
    extract: (text) =>
      llm.extractStructured(
        EXTRACTION_SYSTEM_PROMPT,
        text,
        offerExtractionSchema,
      ),
  };
}
