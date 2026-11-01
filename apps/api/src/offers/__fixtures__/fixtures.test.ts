import {
  offerExtractRequestSchema,
  type OfferExtraction,
} from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import {
  OFFER_FIXTURES,
  readFixtureText,
  scoreExtraction,
  type FixtureExpectation,
} from "./fixtures.js";

function perfect(expected: FixtureExpectation): OfferExtraction {
  return {
    title: expected.title ?? null,
    company: expected.company ?? null,
    location: expected.location ?? null,
    workMode: expected.workMode ?? null,
    seniority: expected.seniority ?? null,
    contractType: expected.contractType ?? null,
    salaryMin: expected.salaryMin ?? null,
    salaryMax: expected.salaryMax ?? null,
    currency: expected.currency ?? null,
    tags: expected.tags ?? [],
  };
}

describe("offer fixtures", () => {
  it("lists the three fixtures", () => {
    expect(OFFER_FIXTURES.map((fixture) => fixture.name)).toEqual([
      "remote-senior",
      "onsite-junior",
      "english-nice-to-have",
    ]);
  });

  it.each(OFFER_FIXTURES.map((fixture) => [fixture.name] as const))(
    "%s is accepted by offerExtractRequestSchema",
    (name) => {
      const text = readFixtureText(name);
      const parsed = offerExtractRequestSchema.safeParse({ text });
      expect(parsed.success).toBe(true);
      expect(text.trim().length).toBeGreaterThanOrEqual(1500);
      expect(text.trim().length).toBeLessThanOrEqual(4000);
    },
  );

  it("reads each file as UTF-8 text", () => {
    expect(readFixtureText("remote-senior")).toContain("Nimbo Software");
    expect(readFixtureText("onsite-junior")).toContain("Sevilla");
    expect(readFixtureText("english-nice-to-have")).toContain("Nice to have");
  });
});

describe("scoreExtraction", () => {
  it.each(OFFER_FIXTURES.map((fixture) => [fixture.name, fixture] as const))(
    "scores a perfect %s extraction as total/total",
    (_name, fixture) => {
      const score = scoreExtraction(
        fixture.expected,
        perfect(fixture.expected),
      );
      expect(score.correct).toBe(score.total);
      expect(score.total).toBeGreaterThan(0);
      expect(score.misses).toEqual([]);
    },
  );

  it("names a wrong company and a missing tag as two misses", () => {
    const fixture = OFFER_FIXTURES[0];
    if (!fixture) throw new Error("no fixture");
    const actual = perfect(fixture.expected);
    actual.company = "Otra Empresa";
    actual.tags = actual.tags.filter((tag) => tag.label !== "React");

    const score = scoreExtraction(fixture.expected, actual);

    expect(score.misses).toEqual(["company", "tag:React"]);
    expect(score.correct).toBe(score.total - 2);
  });

  it("compares strings after trim, lower-case and collapsed spaces", () => {
    const score = scoreExtraction(
      { title: "Full Stack Engineer" },
      { ...perfect({}), title: "  full   STACK engineer " },
    );
    expect(score).toEqual({ correct: 1, total: 1, misses: [] });
  });

  it("matches tags by tagKey and group", () => {
    const expected = { tags: [{ label: "Node.js", group: "stack" as const }] };
    const sameKey = scoreExtraction(expected, {
      ...perfect({}),
      tags: [{ label: " NODE.js ", group: "stack" }],
    });
    const otherGroup = scoreExtraction(expected, {
      ...perfect({}),
      tags: [{ label: "Node.js", group: "nice_to_have" }],
    });
    expect(sameKey.misses).toEqual([]);
    expect(otherGroup.misses).toEqual(["tag:Node.js"]);
  });

  it("scores an expected null against a model that invented a value", () => {
    const score = scoreExtraction(
      { salaryMin: null },
      { ...perfect({}), salaryMin: 30000 },
    );
    expect(score.misses).toEqual(["salaryMin"]);
  });
});
