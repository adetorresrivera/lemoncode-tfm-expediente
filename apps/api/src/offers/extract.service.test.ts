import { offerExtractionSchema, type OfferExtraction } from "@tfm/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors.js";
import type { LlmClient } from "../llm/llm.client.js";
import {
  createExtractService,
  EXTRACTION_SYSTEM_PROMPT,
  normalizeExtraction,
  rawOfferExtractionSchema,
  type RawOfferExtraction,
} from "./extract.service.js";

const BASE: OfferExtraction = {
  title: "Dev",
  company: "Acme",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  tags: [{ label: "React", group: "stack" }],
};

function draft(overrides: Partial<OfferExtraction>): OfferExtraction {
  return { ...BASE, ...overrides };
}

function fakeClient(result: () => Promise<OfferExtraction>) {
  const extractStructured = vi.fn<
    (...args: unknown[]) => Promise<OfferExtraction>
  >(() => result());
  // The generic method is narrowed by the schema argument; the fake answers a fixed draft.
  const llm = {
    extractStructured:
      extractStructured as unknown as LlmClient["extractStructured"],
    ping: async () => true,
  } satisfies LlmClient;
  return { llm, extractStructured };
}

describe("normalizeExtraction", () => {
  it("trims strings and maps empty or blank strings to null", () => {
    const result = normalizeExtraction(
      draft({
        title: "  Desarrollador/a Frontend Senior  ",
        company: "",
        location: "   ",
      }),
    );
    expect(result.title).toBe("Desarrollador/a Frontend Senior");
    expect(result.company).toBeNull();
    expect(result.location).toBeNull();
  });

  it("upper-cases the currency and maps a blank one to null", () => {
    expect(normalizeExtraction(draft({ currency: "eur" })).currency).toBe(
      "EUR",
    );
    expect(normalizeExtraction(draft({ currency: "  " })).currency).toBeNull();
  });

  it("swaps an inverted salary range", () => {
    const result = normalizeExtraction(
      draft({ salaryMin: 55000, salaryMax: 45000 }),
    );
    expect([result.salaryMin, result.salaryMax]).toEqual([45000, 55000]);
  });

  it("keeps equal salaries, decimals and one-sided ranges untouched", () => {
    expect(
      normalizeExtraction(draft({ salaryMin: 50000, salaryMax: 50000 })),
    ).toMatchObject({ salaryMin: 50000, salaryMax: 50000 });
    expect(
      normalizeExtraction(draft({ salaryMin: 45000.5, salaryMax: 60000 }))
        .salaryMin,
    ).toBe(45000.5);
    expect(
      normalizeExtraction(draft({ salaryMin: null, salaryMax: 10 })),
    ).toMatchObject({ salaryMin: null, salaryMax: 10 });
  });

  it("deduplicates tags case-insensitively across groups keeping the first spelling and group", () => {
    const result = normalizeExtraction(
      draft({
        tags: [
          { label: "React", group: "stack" },
          { label: " react ", group: "stack" },
          { label: "REACT", group: "language" },
          { label: "Inglés  B2", group: "language" },
        ],
      }),
    );
    expect(result.tags).toEqual([
      { label: "React", group: "stack" },
      { label: "Inglés B2", group: "language" },
    ]);
  });

  it("cuts a 45-character label to 40 characters", () => {
    const label = "a".repeat(45);
    const result = normalizeExtraction(
      draft({ tags: [{ label, group: "stack" }] }),
    );
    expect(result.tags[0]?.label).toBe("a".repeat(40));
  });

  it("never leaves an unpaired high surrogate at the end of a cut label", () => {
    const label = `${"a".repeat(39)}\u{1F600}bbbb`;
    const result = normalizeExtraction(
      draft({ tags: [{ label, group: "stack" }] }),
    );
    expect(result.tags[0]?.label).toBe("a".repeat(39));
  });

  it("keeps the first 20 of 25 distinct tags in model order", () => {
    const tags = Array.from({ length: 25 }, (_, i) => ({
      label: `Tag ${i}`,
      group: "stack" as const,
    }));
    const result = normalizeExtraction(draft({ tags }));
    expect(result.tags).toHaveLength(20);
    expect(result.tags.map((t) => t.label)).toEqual(
      tags.slice(0, 20).map((t) => t.label),
    );
  });

  it("keeps empty tags empty and an all-null draft all null", () => {
    expect(normalizeExtraction(draft({ tags: [] })).tags).toEqual([]);
    const allNull: OfferExtraction = {
      title: null,
      company: null,
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      tags: [],
    };
    expect(normalizeExtraction(allNull)).toEqual(allNull);
  });

  it("is pure: the input is not mutated and two calls agree", () => {
    const input = draft({
      title: "  x  ",
      salaryMin: 9,
      salaryMax: 1,
      tags: [{ label: " React ", group: "stack" }],
    });
    const snapshot = structuredClone(input);
    const first = normalizeExtraction(input);
    const second = normalizeExtraction(input);
    expect(input).toEqual(snapshot);
    expect(second).toEqual(first);
    expect(first).not.toBe(input);
  });

  it("drops a currency that is not a three-letter code instead of failing", () => {
    expect(normalizeExtraction(draft({ currency: "€" })).currency).toBeNull();
    expect(normalizeExtraction(draft({ currency: " EU" })).currency).toBeNull();
    expect(normalizeExtraction(draft({ currency: " usd " })).currency).toBe(
      "USD",
    );
  });

  it("drops a negative salary and swaps the remaining range", () => {
    const result = normalizeExtraction(
      draft({ salaryMin: -5, salaryMax: 50000 }),
    );
    expect(result.salaryMin).toBeNull();
    expect(result.salaryMax).toBe(50000);
  });

  it("removes empty and blank labels", () => {
    const result = normalizeExtraction(
      draft({
        tags: [
          { label: "", group: "stack" },
          { label: "   ", group: "language" },
          { label: "React", group: "stack" },
        ],
      }),
    );
    expect(result.tags).toEqual([{ label: "React", group: "stack" }]);
  });

  it("throws 502 LLM_ERROR when the normalized draft still breaks the schema", () => {
    // Defensive path: an enum value the normalization cannot repair.
    const broken = {
      ...BASE,
      workMode: "remote",
    } as unknown as RawOfferExtraction;
    try {
      normalizeExtraction(broken);
      expect.unreachable("must throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toMatchObject({ status: 502, code: "LLM_ERROR" });
    }
  });
});

describe("createExtractService", () => {
  const TEXT = "texto de la oferta ".repeat(5);
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the client once with prompt, text, schema and the given signal", async () => {
    const { llm, extractStructured } = fakeClient(async () => BASE);
    const controller = new AbortController();
    await createExtractService(llm).extract(TEXT, {
      signal: controller.signal,
    });

    expect(extractStructured).toHaveBeenCalledTimes(1);
    expect(extractStructured).toHaveBeenCalledWith(
      EXTRACTION_SYSTEM_PROMPT,
      TEXT,
      rawOfferExtractionSchema,
      { signal: controller.signal, responseSchema: offerExtractionSchema },
    );
  });

  it("passes an options object with an undefined signal when none is given", async () => {
    const { llm, extractStructured } = fakeClient(async () => BASE);
    await createExtractService(llm).extract(TEXT);

    const options = extractStructured.mock.calls[0]?.[3] as {
      signal?: AbortSignal;
    };
    expect(options).toBeDefined();
    expect(options.signal).toBeUndefined();
  });

  it("returns the normalized draft", async () => {
    const { llm } = fakeClient(async () =>
      draft({ title: "  Dev  ", company: "" }),
    );
    const result = await createExtractService(llm).extract(TEXT);
    expect(result.title).toBe("Dev");
    expect(result.company).toBeNull();
  });

  it("logs exactly one line with length and duration on success", async () => {
    const { llm } = fakeClient(async () => BASE);
    await createExtractService(llm).extract(TEXT);

    expect(info).toHaveBeenCalledTimes(1);
    const [label, data] = info.mock.calls[0] ?? [];
    expect(label).toBe("offers.extract");
    expect(Object.keys(data as object).sort()).toEqual([
      "durationMs",
      "length",
    ]);
    expect((data as { length: number }).length).toBe(TEXT.length);
    const duration = (data as { durationMs: number }).durationMs;
    expect(Number.isInteger(duration) && duration >= 0).toBe(true);
  });

  it("propagates a timeout unchanged and still logs one line", async () => {
    const timeout = new ApiError(
      504,
      "LLM_TIMEOUT",
      "El modelo tardó demasiado",
    );
    const { llm } = fakeClient(async () => {
      throw timeout;
    });

    await expect(createExtractService(llm).extract(TEXT)).rejects.toBe(timeout);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]?.[0]).toBe("offers.extract");
  });
});
