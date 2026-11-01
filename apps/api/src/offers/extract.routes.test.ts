import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { errorResponseSchema, offerExtractionSchema } from "@tfm/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDeps } from "../app.js";
import { createLlmClient, type LlmClient } from "../llm/llm.client.js";
import { MOCK_OFFER_EXTRACTION } from "../llm/mock.provider.js";
import { EXTRACTION_SYSTEM_PROMPT } from "./extract.service.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };

const OFFER_TEXT =
  "Buscamos un desarrollador frontend con experiencia. ".repeat(2);

// Records the arguments it receives and answers the fixed extraction through the given schema.
function fakeLlm() {
  const calls: unknown[][] = [];
  const llm: LlmClient = {
    async extractStructured(system, input, schema) {
      calls.push([system, input, schema]);
      return schema.parse(MOCK_OFFER_EXTRACTION);
    },
    ping: async () => true,
  };
  return { llm, calls };
}

function postExtract(
  app: ReturnType<typeof createApp>,
  body: unknown,
  headers: Record<string, string> = JSON_HEADERS,
) {
  return app.request("/api/offers/extract", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// The first fenced block after the «## Prompt de sistema» heading of the AI doc.
function promptFromDoc(): string {
  const doc = readFileSync(
    fileURLToPath(
      new URL("../../../../docs/AI-EXTRACTION.md", import.meta.url),
    ),
    "utf8",
  );
  const lines = doc.split("\n");
  const heading = lines.findIndex((line) =>
    line.startsWith("## Prompt de sistema"),
  );
  const open = lines.findIndex(
    (line, index) => index > heading && line.startsWith("```"),
  );
  const close = lines.findIndex(
    (line, index) => index > open && line.startsWith("```"),
  );
  return lines.slice(open + 1, close).join("\n");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/offers/extract", () => {
  it("answers 200 with a valid extraction and calls the client with the trimmed text", async () => {
    const { llm, calls } = fakeLlm();
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: `  ${OFFER_TEXT}  `,
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(offerExtractionSchema.parse(body)).toEqual(MOCK_OFFER_EXTRACTION);
    expect(calls).toHaveLength(1);
    const args: unknown[] = calls[0] ?? [];
    expect(args[1]).toBe(OFFER_TEXT.trim());
    expect(args[2]).toBe(offerExtractionSchema);
  });

  it("hands the model the system prompt of docs/AI-EXTRACTION.md byte for byte", async () => {
    const { llm, calls } = fakeLlm();
    await postExtract(createApp({ ...allUp, llm }), { text: OFFER_TEXT });

    const promptDoc = promptFromDoc();
    expect(promptDoc.startsWith("Eres un extractor de datos")).toBe(true);
    const args: unknown[] = calls[0] ?? [];
    expect(args[0]).toBe(promptDoc);
    expect(EXTRACTION_SYSTEM_PROMPT).toBe(promptDoc);
  });

  it("answers the mock extraction offline with LLM_PROVIDER=mock", async () => {
    const llm = createLlmClient({
      LLM_PROVIDER: "mock",
      LLM_BASE_URL: undefined,
      LLM_MODEL: undefined,
      LLM_API_KEY: undefined,
      LLM_TIMEOUT_MS: 90000,
    });
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: OFFER_TEXT,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(MOCK_OFFER_EXTRACTION);
  });

  it.each([
    ["an empty body", {}],
    ["a missing text", { other: "x" }],
    ["whitespace only", { text: "   " }],
    ["49 trimmed characters", { text: ` ${"a".repeat(49)} ` }],
    ["20,001 trimmed characters", { text: "a".repeat(20001) }],
  ])("answers 400 VALIDATION_ERROR for %s", async (_name, body) => {
    const { llm, calls } = fakeLlm();
    const res = await postExtract(createApp({ ...allUp, llm }), body);

    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(calls).toHaveLength(0);
  });

  it("answers 400 VALIDATION_ERROR for a non-JSON content type", async () => {
    const { llm, calls } = fakeLlm();
    const res = await postExtract(
      createApp({ ...allUp, llm }),
      JSON.stringify({ text: OFFER_TEXT }),
      { "content-type": "text/plain" },
    );

    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(calls).toHaveLength(0);
  });

  it("answers 400 VALIDATION_ERROR for malformed JSON", async () => {
    const { llm } = fakeLlm();
    const res = await postExtract(createApp({ ...allUp, llm }), "{not json");

    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["50", "a".repeat(50)],
    ["20,000", "a".repeat(20000)],
  ])("accepts %s trimmed characters", async (_name, text) => {
    const { llm, calls } = fakeLlm();
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: ` ${text} `,
    });

    expect(res.status).toBe(200);
    expect(calls[0]?.[1]).toBe(text);
  });

  it("serves two concurrent requests independently", async () => {
    const { llm, calls } = fakeLlm();
    const app = createApp({ ...allUp, llm });
    const first = `${OFFER_TEXT} primera`;
    const second = `${OFFER_TEXT} segunda`;

    const [a, b] = await Promise.all([
      postExtract(app, { text: first }),
      postExtract(app, { text: second }),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(calls.map((call) => call[1])).toStrictEqual([first, second]);
  });

  it("does not mount /api/offers without an llm dependency", async () => {
    const res = await postExtract(createApp(allUp), { text: OFFER_TEXT });

    expect(res.status).toBe(404);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
