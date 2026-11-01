import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  errorResponseSchema,
  offerExtractionSchema,
  type OfferExtraction,
} from "@tfm/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDeps } from "../app.js";
import { ApiError } from "../errors.js";
import { createLlmClient, type LlmClient } from "../llm/llm.client.js";
import { MOCK_OFFER_EXTRACTION } from "../llm/mock.provider.js";
import {
  OFFER_FIXTURES,
  readFixtureText,
  type FixtureName,
} from "./__fixtures__/fixtures.js";
import {
  EXTRACTION_SYSTEM_PROMPT,
  rawOfferExtractionSchema,
} from "./extract.service.js";

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
    async extractStructured(system, input, schema, options) {
      calls.push([system, input, schema, options]);
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

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;
type ConsoleSpies = Record<
  (typeof CONSOLE_METHODS)[number],
  ReturnType<typeof vi.spyOn>
>;
let consoleSpies: ConsoleSpies;

beforeEach(() => {
  consoleSpies = Object.fromEntries(
    CONSOLE_METHODS.map((method) => [
      method,
      vi.spyOn(console, method).mockImplementation(() => undefined),
    ]),
  ) as ConsoleSpies;
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
    expect(args[2]).toBe(rawOfferExtractionSchema);
    expect(args[3]).toEqual(
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        responseSchema: offerExtractionSchema,
      }),
    );
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

  it("never logs any part of a malformed body", async () => {
    const { llm } = fakeLlm();
    // V8 quotes only ~20 characters around the error, so the marker must sit right there.
    const marker = "QZXW";
    const res = await postExtract(
      createApp({ ...allUp, llm }),
      `{"text": ${marker}-oferta confidencial`,
    );

    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(parsed.error.message).not.toContain(marker);
    expect(consoleSpies.error).toHaveBeenCalled();
    for (const spy of Object.values(consoleSpies)) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(marker);
    }
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

// A client that answers a fixed (possibly dirty) draft or rejects with the given error.
function scriptedLlm(outcome: OfferExtraction | Error): LlmClient {
  return {
    async extractStructured() {
      if (outcome instanceof Error) throw outcome;
      return outcome as never;
    },
    ping: async () => true,
  };
}

const DIRTY: Record<FixtureName, OfferExtraction> = {
  "remote-senior": {
    title: "  Desarrollador/a Frontend Senior  ",
    company: "",
    location: "   ",
    workMode: "remoto",
    seniority: "senior",
    contractType: "indefinido",
    salaryMin: 55000,
    salaryMax: 45000,
    currency: "eur",
    tags: [
      { label: "React", group: "stack" },
      { label: " react ", group: "stack" },
      { label: "Inglés  B2", group: "language" },
    ],
  },
  "onsite-junior": {
    title: "Programador/a Backend Junior ",
    company: " Talleres Digitales del Sur",
    location: "Sevilla",
    workMode: "presencial",
    seniority: "junior",
    contractType: "temporal",
    salaryMin: null,
    salaryMax: null,
    currency: " ",
    tags: [
      { label: "Java", group: "stack" },
      { label: "JAVA", group: "nice_to_have" },
      { label: "  ", group: "stack" },
    ],
  },
  "english-nice-to-have": {
    title: "Full Stack Engineer",
    company: "Northwind Labs",
    location: "London",
    workMode: "hibrido",
    seniority: "mid",
    contractType: "indefinido",
    salaryMin: 50000,
    salaryMax: 60000,
    currency: "gbp",
    tags: [
      { label: "x".repeat(45), group: "stack" },
      { label: "GraphQL", group: "nice_to_have" },
    ],
  },
};

describe("POST /api/offers/extract with the fixture offers", () => {
  it.each(OFFER_FIXTURES.map((fixture) => [fixture.name] as const))(
    "answers a normalized draft for %s",
    async (name) => {
      const llm = scriptedLlm(DIRTY[name]);
      const res = await postExtract(createApp({ ...allUp, llm }), {
        text: readFixtureText(name),
      });

      expect(res.status).toBe(200);
      const body = offerExtractionSchema.parse(await res.json());
      expect(body.title).toBe(DIRTY[name].title?.trim());
      expect(body.company).toBe(DIRTY[name].company?.trim() || null);
      expect(body.currency).toBe(
        DIRTY[name].currency?.trim().toUpperCase() || null,
      );
      if (name === "remote-senior") {
        expect([body.salaryMin, body.salaryMax]).toEqual([45000, 55000]);
        expect(body.location).toBeNull();
        expect(body.tags).toEqual([
          { label: "React", group: "stack" },
          { label: "Inglés B2", group: "language" },
        ]);
      }
      if (name === "onsite-junior") {
        expect(body.tags).toEqual([{ label: "Java", group: "stack" }]);
      }
      if (name === "english-nice-to-have") {
        expect(body.tags[0]?.label).toBe("x".repeat(40));
      }
    },
  );
});

describe("POST /api/offers/extract hardening", () => {
  it("answers 400 VALIDATION_ERROR for a 300 KiB body and never calls the model", async () => {
    const { llm, calls } = fakeLlm();
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: "a".repeat(300 * 1024),
    });

    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(calls).toHaveLength(0);
  });

  it("maps a model timeout to 504 LLM_TIMEOUT", async () => {
    const llm = scriptedLlm(
      new ApiError(504, "LLM_TIMEOUT", "El modelo tardó demasiado"),
    );
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: OFFER_TEXT,
    });

    expect(res.status).toBe(504);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "LLM_TIMEOUT",
    );
  });

  it("maps a model failure to 502 LLM_ERROR", async () => {
    const llm = scriptedLlm(
      new ApiError(502, "LLM_ERROR", "El modelo no respondió"),
    );
    const res = await postExtract(createApp({ ...allUp, llm }), {
      text: OFFER_TEXT,
    });

    expect(res.status).toBe(502);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "LLM_ERROR",
    );
  });

  describe("never leaks the offer text", () => {
    const SENTINEL = "SENTINEL-OFFER-9c1";

    function loggedText(): string {
      return JSON.stringify(
        CONSOLE_METHODS.flatMap((method) => consoleSpies[method].mock.calls),
      );
    }

    it.each([
      ["200", scriptedLlm(DIRTY["remote-senior"])],
      [
        "502",
        scriptedLlm(new ApiError(502, "LLM_ERROR", "El modelo no respondió")),
      ],
      [
        "504",
        scriptedLlm(
          new ApiError(504, "LLM_TIMEOUT", "El modelo tardó demasiado"),
        ),
      ],
    ])(
      "on %s neither the logs nor the body carry the text",
      async (_s, llm) => {
        const text = `${SENTINEL} ${OFFER_TEXT}`;
        const res = await postExtract(createApp({ ...allUp, llm }), { text });

        expect(await res.text()).not.toContain(SENTINEL);
        expect(loggedText()).not.toContain(SENTINEL);
      },
    );

    it("on 400 for a 49-character text", async () => {
      const { llm } = fakeLlm();
      const res = await postExtract(createApp({ ...allUp, llm }), {
        text: `${SENTINEL} ${"a".repeat(30)}`,
      });

      expect(res.status).toBe(400);
      expect(await res.text()).not.toContain(SENTINEL);
      expect(loggedText()).not.toContain(SENTINEL);
    });

    it("on 400 for a 300 KiB body", async () => {
      const { llm } = fakeLlm();
      const res = await postExtract(createApp({ ...allUp, llm }), {
        text: `${SENTINEL} ${"a".repeat(300 * 1024)}`,
      });

      expect(res.status).toBe(400);
      expect(await res.text()).not.toContain(SENTINEL);
      expect(loggedText()).not.toContain(SENTINEL);
    });
  });
});
