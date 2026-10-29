import type { OfferExtraction } from "@tfm/contracts";
import type { LlmClient } from "./llm.client.js";

const MOCK_DELAY_MS = 300;

/** Fixed, realistic draft returned offline (docs/AI-EXTRACTION.md, provider mock). */
export const MOCK_OFFER_EXTRACTION = {
  title: "Desarrollador/a Frontend Senior",
  company: "Lumen Analytics",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  tags: [
    { label: "React", group: "stack" },
    { label: "TypeScript", group: "stack" },
    { label: "Vite", group: "stack" },
    { label: "Testing Library", group: "nice_to_have" },
    { label: "Inglés B2", group: "language" },
  ],
} satisfies OfferExtraction;

export function createMockProvider(): LlmClient {
  return {
    async extractStructured(_system, _input, schema) {
      // Neither the prompt nor the offer text is logged or inspected here.
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
      return schema.parse(MOCK_OFFER_EXTRACTION);
    },
    async ping() {
      return true;
    },
  };
}
