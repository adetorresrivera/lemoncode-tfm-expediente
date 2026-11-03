import { describe, expect, it } from "vitest";
import {
  applicationInputSchema,
  applicationQuerySchema,
  applicationSchema,
  statusChangeSchema,
} from "./index.js";

const minimal = { title: "Frontend Developer", company: "Acme" };

describe("applicationInputSchema", () => {
  it("fills defaults from {title, company} alone", () => {
    expect(applicationInputSchema.parse(minimal)).toEqual({
      ...minimal,
      status: "guardada",
      tags: [],
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      sourceUrl: null,
      offerText: null,
      appliedAt: null,
      notes: null,
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
  });

  it("bounds title to 2..120 and requires a company", () => {
    const parse = (title: string) =>
      applicationInputSchema.safeParse({ ...minimal, title }).success;
    expect(parse("A")).toBe(false);
    expect(parse("AB")).toBe(true);
    expect(parse("a".repeat(120))).toBe(true);
    expect(parse("a".repeat(121))).toBe(false);
    expect(
      applicationInputSchema.safeParse({ ...minimal, company: "" }).success,
    ).toBe(false);
  });

  it("accepts salaryMin equal to salaryMax", () => {
    expect(
      applicationInputSchema.safeParse({
        ...minimal,
        salaryMin: 50000,
        salaryMax: 50000,
      }).success,
    ).toBe(true);
  });

  it("rejects salaryMin greater than salaryMax at path salaryMax", () => {
    const result = applicationInputSchema.safeParse({
      ...minimal,
      salaryMin: 60000,
      salaryMax: 50000,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["salaryMax"]);
  });

  it("rejects negative salaries", () => {
    expect(
      applicationInputSchema.safeParse({ ...minimal, salaryMin: -1 }).success,
    ).toBe(false);
  });

  it("limits tags to 20", () => {
    const tags = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ label: `t${i}`, group: "stack" }));
    expect(
      applicationInputSchema.safeParse({ ...minimal, tags: tags(20) }).success,
    ).toBe(true);
    expect(
      applicationInputSchema.safeParse({ ...minimal, tags: tags(21) }).success,
    ).toBe(false);
  });

  it("only accepts http and https source URLs", () => {
    const parse = (sourceUrl: string) =>
      applicationInputSchema.safeParse({ ...minimal, sourceUrl }).success;
    expect(parse("not a url")).toBe(false);
    expect(parse("javascript:alert(1)")).toBe(false);
    expect(parse("ftp://example.com/oferta")).toBe(false);
    expect(parse("https://example.com/oferta")).toBe(true);
    expect(parse("http://example.com/oferta")).toBe(true);
  });

  it("limits offerText to 20000 characters", () => {
    expect(
      applicationInputSchema.safeParse({
        ...minimal,
        offerText: "a".repeat(20000),
      }).success,
    ).toBe(true);
    expect(
      applicationInputSchema.safeParse({
        ...minimal,
        offerText: "a".repeat(20001),
      }).success,
    ).toBe(false);
  });

  it("upper-cases the currency and rejects anything but three letters", () => {
    expect(
      applicationInputSchema.parse({ ...minimal, currency: "eur" }).currency,
    ).toBe("EUR");
    expect(
      applicationInputSchema.safeParse({ ...minimal, currency: "EURO" })
        .success,
    ).toBe(false);
  });
});

describe("applicationQuerySchema", () => {
  it("defaults sort to updatedAt and leaves status undefined", () => {
    const parsed = applicationQuerySchema.parse({});
    expect(parsed.sort).toBe("updatedAt");
    expect(parsed.status).toBeUndefined();
  });

  it("wraps a single status into a one-element array", () => {
    expect(applicationQuerySchema.parse({ status: "enviada" }).status).toEqual([
      "enviada",
    ]);
  });

  it("keeps repeated status values", () => {
    expect(
      applicationQuerySchema.parse({ status: ["enviada", "guardada"] }).status,
    ).toEqual(["enviada", "guardada"]);
  });

  it("rejects unknown status and sort values", () => {
    expect(applicationQuerySchema.safeParse({ status: "nope" }).success).toBe(
      false,
    );
    expect(applicationQuerySchema.safeParse({ sort: "title" }).success).toBe(
      false,
    );
  });

  it("coerces tags the same way", () => {
    expect(applicationQuerySchema.parse({ tags: "React" }).tags).toEqual([
      "React",
    ]);
  });
});

describe("statusChangeSchema", () => {
  it("rejects extra keys and unknown statuses", () => {
    expect(
      statusChangeSchema.safeParse({ status: "enviada", extra: 1 }).success,
    ).toBe(false);
    expect(statusChangeSchema.safeParse({ status: "nope" }).success).toBe(
      false,
    );
    expect(statusChangeSchema.safeParse({ status: "enviada" }).success).toBe(
      true,
    );
  });
});

describe("applicationSchema", () => {
  it("accepts a full entity", () => {
    const result = applicationSchema.safeParse({
      ...minimal,
      id: "507f1f77bcf86cd799439011",
      status: "guardada",
      statusHistory: [{ status: "guardada", at: "2026-10-29T10:00:00Z" }],
      interviews: [],
      createdAt: "2026-10-29T10:00:00Z",
      updatedAt: "2026-10-29T10:00:00Z",
      ownerId: null,
    });
    expect(result.success).toBe(true);
  });
});
