import { offerExtractionSchema, tagGroupSchema } from "@tfm/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp, type AppDeps } from "../app.js";
import { ApiError } from "../errors.js";
import { createLlmClient, type LlmConfig } from "../llm/llm.client.js";
import { createExtractService } from "./extract.service.js";

// Real pipeline: provider -> callStructured -> normalizeExtraction, with only fetch faked.
// The model answers raw output that offerExtractionSchema alone would reject.

const ollamaConfig: LlmConfig = {
  LLM_PROVIDER: "ollama",
  LLM_BASE_URL: "http://ollama:11434",
  LLM_MODEL: "qwen3",
  LLM_API_KEY: undefined,
  LLM_TIMEOUT_MS: 90_000,
};
const openaiConfig: LlmConfig = {
  LLM_PROVIDER: "openai",
  LLM_BASE_URL: "https://example.test/v1",
  LLM_MODEL: "gpt-test",
  LLM_API_KEY: "test-key",
  LLM_TIMEOUT_MS: 90_000,
};

const TEXT = "Buscamos un desarrollador frontend con experiencia. ".repeat(2);

const OVER_LONG_LABEL = `Plataforma ${"muy larga ".repeat(6)}`.trim();
const RAW_OFF_SPEC = {
  title: "  Dev Frontend ",
  company: "Acme",
  location: null,
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 55000,
  salaryMax: 45000,
  currency: "€",
  tags: [
    { label: OVER_LONG_LABEL, group: "stack" },
    { label: "", group: "stack" },
    { label: "react", group: "stack" },
    { label: "React", group: "nice_to_have" },
    ...Array.from({ length: 24 }, (_, i) => ({
      label: `Tag ${i}`,
      group: "stack" as const,
    })),
  ],
};

function stubModel(
  config: LlmConfig,
  content: unknown,
): ReturnType<
  typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>
> {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  const payload =
    config.LLM_PROVIDER === "ollama"
      ? { message: { content: text } }
      : { choices: [{ message: { content: text } }] };
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each([
  ["ollama", ollamaConfig],
  ["openai", openaiConfig],
] as const)("extraction pipeline with the %s provider", (_name, config) => {
  it("truncates, caps and cleans over-long raw output instead of answering 502", async () => {
    stubModel(config, RAW_OFF_SPEC);
    const result = await createExtractService(createLlmClient(config)).extract(
      TEXT,
    );

    expect(offerExtractionSchema.safeParse(result).success).toBe(true);
    expect(result.title).toBe("Dev Frontend");
    expect(result.tags).toHaveLength(20);
    expect(result.tags[0]).toEqual({
      label: OVER_LONG_LABEL.slice(0, 40).trim(),
      group: "stack",
    });
    expect(result.tags.every((tag) => tag.label.length <= 40)).toBe(true);
    expect(result.tags.some((tag) => tag.label === "")).toBe(false);
    // "react" and "React" collapse into one tag (the first spelling wins).
    expect(
      result.tags.filter((tag) => tag.label.toLowerCase() === "react"),
    ).toEqual([{ label: "react", group: "stack" }]);
    expect(result.salaryMin).toBe(45000);
    expect(result.salaryMax).toBe(55000);
    expect(result.currency).toBeNull();
  });

  it("shows the model the provider-facing schema, without the word language", async () => {
    const fetchMock = stubModel(config, RAW_OFF_SPEC);
    await createExtractService(createLlmClient(config)).extract(TEXT);

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      format?: unknown;
      response_format?: { json_schema: { schema: unknown } };
      messages: { role: string; content: string }[];
    };
    const sent =
      config.LLM_PROVIDER === "ollama"
        ? body.format
        : body.response_format?.json_schema.schema;

    const contract: Record<string, unknown> = {
      ...z.toJSONSchema(offerExtractionSchema),
    };
    if (config.LLM_PROVIDER !== "ollama") delete contract.$schema;
    const expected = structuredClone(contract) as {
      required: string[];
      properties: {
        tags: { items: { properties: { group: { enum: string[] } } } };
        idiomas?: unknown;
      };
    };
    expect(expected.properties.tags.items.properties.group.enum).toEqual([
      "stack",
      "nice_to_have",
      "language",
    ]);
    expected.properties.tags.items.properties.group.enum = [
      "stack",
      "nice_to_have",
      "idioma",
    ];
    expected.properties.idiomas = {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 40 },
    };
    expected.required = [...expected.required, "idiomas"];
    expect(sent).toEqual(expected);
    expect(JSON.stringify(sent)).not.toContain("language");
    expect(body.messages[0]?.content).not.toContain("language");
  });

  it("moves programming languages the model put in the language group to stack", async () => {
    const model = {
      ...RAW_OFF_SPEC,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      tags: [
        { label: "C", group: "idioma" },
        { label: "Python", group: "idioma" },
        { label: "Java", group: "language" },
        { label: "Inglés B2", group: "idioma" },
      ],
    };
    const expected = [
      { label: "C", group: "stack" },
      { label: "Python", group: "stack" },
      { label: "Java", group: "stack" },
      { label: "Inglés B2", group: "language" },
    ];

    stubModel(config, model);
    const result = await createExtractService(createLlmClient(config)).extract(
      TEXT,
    );
    expect(result.tags).toEqual(expected);

    stubModel(config, model);
    const deps: AppDeps = {
      pingMongo: async () => true,
      pingS3: async () => true,
      pingLlm: async () => true,
      llm: createLlmClient(config),
    };
    const res = await createApp(deps).request("/api/offers/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: TEXT }),
    });
    expect(res.status).toBe(200);
    const body = offerExtractionSchema.parse(await res.json());
    expect(body.tags).toEqual(expected);
    const groups: readonly string[] = tagGroupSchema.options;
    expect(body.tags.every((tag) => groups.includes(tag.group))).toBe(true);
    expect(body.tags.some((tag) => (tag.group as string) === "idioma")).toBe(
      false,
    );
  });

  it("files the spoken languages the model lists in idiomas under language, outside the closed word list", async () => {
    const model = {
      ...RAW_OFF_SPEC,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      tags: [
        { label: "C", group: "idioma" },
        { label: "Python", group: "idioma" },
        { label: "React", group: "stack" },
      ],
      idiomas: ["Coreano B1", "Hindi"],
    };
    const expected = [
      { label: "Coreano B1", group: "language" },
      { label: "Hindi", group: "language" },
      { label: "C", group: "stack" },
      { label: "Python", group: "stack" },
      { label: "React", group: "stack" },
    ];

    stubModel(config, model);
    const result = await createExtractService(createLlmClient(config)).extract(
      TEXT,
    );
    expect(result.tags).toEqual(expected);

    stubModel(config, model);
    const deps: AppDeps = {
      pingMongo: async () => true,
      pingS3: async () => true,
      pingLlm: async () => true,
      llm: createLlmClient(config),
    };
    const res = await createApp(deps).request("/api/offers/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: TEXT }),
    });
    expect(res.status).toBe(200);
    const json: unknown = await res.json();
    expect(typeof json === "object" && json !== null && "idiomas" in json).toBe(
      false,
    );
    const body = offerExtractionSchema.parse(json);
    expect(body.tags).toEqual(expected);
    expect(body.tags.some((tag) => (tag.group as string) === "idioma")).toBe(
      false,
    );
  });

  it("answers 502 LLM_ERROR after one retry when the output is genuinely unusable", async () => {
    const fetchMock = stubModel(config, { title: 42 });
    const error = await createExtractService(createLlmClient(config))
      .extract(TEXT)
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves the normalized draft through POST /api/offers/extract", async () => {
    stubModel(config, RAW_OFF_SPEC);
    const deps: AppDeps = {
      pingMongo: async () => true,
      pingS3: async () => true,
      pingLlm: async () => true,
      llm: createLlmClient(config),
    };
    const res = await createApp(deps).request("/api/offers/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: TEXT }),
    });

    expect(res.status).toBe(200);
    const body = offerExtractionSchema.parse(await res.json());
    expect(body.tags).toHaveLength(20);
    expect(body.currency).toBeNull();
  });
});
