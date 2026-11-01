import { offerExtractionSchema } from "@tfm/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "../errors.js";
import {
  createLlmClient,
  type LlmClient,
  type LlmConfig,
} from "./llm.client.js";
import { MOCK_OFFER_EXTRACTION } from "./mock.provider.js";

const ollamaConfig: LlmConfig = {
  LLM_PROVIDER: "ollama",
  LLM_BASE_URL: "http://ollama:11434/",
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
const mockConfig: LlmConfig = {
  LLM_PROVIDER: "mock",
  LLM_BASE_URL: undefined,
  LLM_MODEL: undefined,
  LLM_API_KEY: undefined,
  LLM_TIMEOUT_MS: 90_000,
};

function stubFetch(status: number) {
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(async () => new Response(null, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetchJson(body: unknown, status = 200) {
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(async () => jsonResponse(body, status));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A fetch that only settles by rejecting when its signal aborts. */
function stubHangingFetch() {
  const fetchMock = vi.fn<
    (url: string, init?: RequestInit) => Promise<Response>
  >(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function bodyOf(init?: RequestInit): unknown {
  return JSON.parse(String(init?.body));
}

const VALID_CONTENT = JSON.stringify(MOCK_OFFER_EXTRACTION);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createLlmClient", () => {
  it("returns a client for every provider", () => {
    for (const config of [ollamaConfig, openaiConfig, mockConfig]) {
      const client = createLlmClient(config);
      expect(typeof client.ping).toBe("function");
      expect(typeof client.extractStructured).toBe("function");
    }
  });
});

describe("ollama provider", () => {
  it("pings {base}/api/version, normalising a trailing slash", async () => {
    const fetchMock = stubFetch(200);
    expect(await createLlmClient(ollamaConfig).ping()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://ollama:11434/api/version",
    );
  });

  it("returns false on a non-2xx answer", async () => {
    stubFetch(503);
    expect(await createLlmClient(ollamaConfig).ping()).toBe(false);
  });

  it("returns false when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );
    expect(await createLlmClient(ollamaConfig).ping()).toBe(false);
  });

  it("bounds ping with an AbortSignal of at most 2.5 s and hands that signal to fetch", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = stubFetch(200);
    expect(await createLlmClient(ollamaConfig).ping()).toBe(true);
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    const ms = timeoutSpy.mock.calls[0]?.[0];
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(2500);
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal).toBe(timeoutSpy.mock.results[0]?.value);
  });

  it("posts the structured chat request to {base}/api/chat", async () => {
    const fetchMock = stubFetchJson({
      message: { content: VALID_CONTENT },
    });
    await createLlmClient(ollamaConfig).extractStructured(
      "sys",
      "input",
      offerExtractionSchema,
    );
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://ollama:11434/api/chat");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(bodyOf(init)).toEqual({
      model: "qwen3",
      stream: false,
      think: false,
      options: { temperature: 0, num_ctx: 8192 },
      format: z.toJSONSchema(offerExtractionSchema),
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "input" },
      ],
    });
  });

  it("returns the schema-valid object parsed from message.content", async () => {
    stubFetchJson({ message: { content: VALID_CONTENT } });
    const result = await createLlmClient(ollamaConfig).extractStructured(
      "sys",
      "input",
      offerExtractionSchema,
    );
    expect(result).toEqual(MOCK_OFFER_EXTRACTION);
  });

  it("answers 502 LLM_ERROR on a non-2xx answer without retrying", async () => {
    const fetchMock = stubFetchJson({ error: "boom" }, 500);
    const error = await createLlmClient(ollamaConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once when message.content is missing, then answers 502", async () => {
    const fetchMock = stubFetchJson({ message: {} });
    const error = await createLlmClient(ollamaConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("answers 504 LLM_TIMEOUT when the model outlasts LLM_TIMEOUT_MS", async () => {
    stubHangingFetch();
    const error = await createLlmClient({
      ...ollamaConfig,
      LLM_TIMEOUT_MS: 50,
    })
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 504, code: "LLM_TIMEOUT" });
  });
});

describe("openai provider", () => {
  it("pings {base}/models with a bearer header", async () => {
    const fetchMock = stubFetch(200);
    expect(await createLlmClient(openaiConfig).ping()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://example.test/v1/models");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer test-key",
    );
  });

  it("returns false on 401", async () => {
    stubFetch(401);
    expect(await createLlmClient(openaiConfig).ping()).toBe(false);
  });

  it("returns false when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );
    expect(await createLlmClient(openaiConfig).ping()).toBe(false);
  });

  it("bounds ping with an AbortSignal of at most 2.5 s and hands that signal to fetch", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = stubFetch(200);
    expect(await createLlmClient(openaiConfig).ping()).toBe(true);
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    const ms = timeoutSpy.mock.calls[0]?.[0];
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(2500);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.signal).toBe(timeoutSpy.mock.results[0]?.value);
  });

  it("posts a strict json_schema request to {base}/chat/completions", async () => {
    const fetchMock = stubFetchJson({
      choices: [{ message: { content: VALID_CONTENT } }],
    });
    await createLlmClient(openaiConfig).extractStructured(
      "sys",
      "input",
      offerExtractionSchema,
    );
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init?.signal).toBeInstanceOf(AbortSignal);

    const body = bodyOf(init) as {
      model: string;
      temperature: number;
      messages: unknown;
      response_format: {
        type: string;
        json_schema: {
          name: string;
          strict: boolean;
          schema: Record<string, unknown>;
        };
      };
    };
    expect(body.model).toBe("gpt-test");
    expect(body.temperature).toBe(0);
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "input" },
    ]);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("offer_extraction");
    expect(body.response_format.json_schema.strict).toBe(true);
    const schema = body.response_format.json_schema.schema;
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toHaveProperty("properties.tags");
  });

  it("returns the schema-valid object parsed from choices[0].message.content", async () => {
    stubFetchJson({ choices: [{ message: { content: VALID_CONTENT } }] });
    const result = await createLlmClient(openaiConfig).extractStructured(
      "sys",
      "input",
      offerExtractionSchema,
    );
    expect(result).toEqual(MOCK_OFFER_EXTRACTION);
  });

  it("retries once when content is null, then answers 502", async () => {
    const fetchMock = stubFetchJson({
      choices: [{ message: { content: null } }],
    });
    const error = await createLlmClient(openaiConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("answers 502 LLM_ERROR on a 401 without the key in the message", async () => {
    stubFetchJson({ error: { message: "bad key test-key" } }, 401);
    const error = await createLlmClient(openaiConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect((error as ApiError).message).not.toContain("test-key");
  });

  it("answers 504 LLM_TIMEOUT when the model outlasts LLM_TIMEOUT_MS", async () => {
    stubHangingFetch();
    const error = await createLlmClient({
      ...openaiConfig,
      LLM_TIMEOUT_MS: 50,
    })
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 504, code: "LLM_TIMEOUT" });
  });
});

describe("mock provider", () => {
  it("pings true without touching the network", async () => {
    const fetchMock = stubFetch(500);
    expect(await createLlmClient(mockConfig).ping()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves no earlier than 300 ms with a contract-valid extraction", async () => {
    vi.useFakeTimers();
    let settled = false;
    const promise = createLlmClient(mockConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(299);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const value = await promise;
    expect(settled).toBe(true);
    expect(offerExtractionSchema.safeParse(value).success).toBe(true);
  });
});

describe("LlmClient interface", () => {
  it("accepts a three-parameter extractStructured implementation", () => {
    const fake: LlmClient = {
      async extractStructured(_system, _input, schema) {
        return schema.parse(MOCK_OFFER_EXTRACTION);
      },
      async ping() {
        return true;
      },
    };
    expect(typeof fake.extractStructured).toBe("function");
  });

  it("forwards the request signal to the upstream fetch", async () => {
    const fetchMock = stubHangingFetch();
    const controller = new AbortController();
    const pending = createLlmClient(ollamaConfig)
      .extractStructured("sys", "input", offerExtractionSchema, {
        signal: controller.signal,
      })
      .catch((e: unknown) => e);
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    const error = await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
  });
});
