import { offerExtractionSchema } from "@tfm/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors.js";
import { createLlmClient, type LlmConfig } from "./llm.client.js";

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

  it("extractStructured rejects with ApiError 502 LLM_ERROR", async () => {
    const error = await createLlmClient(ollamaConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
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

  it("extractStructured rejects with ApiError 502 LLM_ERROR, without the key", async () => {
    const error = await createLlmClient(openaiConfig)
      .extractStructured("sys", "input", offerExtractionSchema)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect((error as ApiError).message).not.toContain("test-key");
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
