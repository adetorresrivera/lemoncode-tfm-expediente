import type { OfferExtraction } from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import { mergeExtractionIntoForm } from "./application-edit.mapper";
import {
  EMPTY_FORM_VALUES,
  type ApplicationFormValues,
} from "./application-edit.vm";

const NOTHING: OfferExtraction = {
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

const extraction = (overrides: Partial<OfferExtraction>): OfferExtraction => ({
  ...NOTHING,
  ...overrides,
});

const form = (
  overrides: Partial<ApplicationFormValues>,
): ApplicationFormValues => ({ ...EMPTY_FORM_VALUES, ...overrides });

describe("mergeExtractionIntoForm: the six-field rule", () => {
  it("fills the six text and select fields that are empty", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({
        title: "Frontend",
        company: "Acme",
        location: "Madrid",
        workMode: "remoto",
        seniority: "senior",
        contractType: "indefinido",
      }),
    );
    expect(merge.values).toMatchObject({
      title: "Frontend",
      company: "Acme",
      location: "Madrid",
      workMode: "remoto",
      seniority: "senior",
      contractType: "indefinido",
    });
    expect(merge.aiFields).toEqual([
      "title",
      "company",
      "location",
      "workMode",
      "seniority",
      "contractType",
    ]);
  });

  it("keeps the values the user typed", () => {
    const merge = mergeExtractionIntoForm(
      form({ title: "Mi puesto", workMode: "presencial" }),
      extraction({
        title: "Otro",
        company: "Acme",
        workMode: "remoto",
      }),
    );
    expect(merge.values.title).toBe("Mi puesto");
    expect(merge.values.workMode).toBe("presencial");
    expect(merge.values.company).toBe("Acme");
    expect(merge.aiFields).toEqual(["company"]);
  });

  it("treats a whitespace-only value as empty", () => {
    const merge = mergeExtractionIntoForm(
      form({ company: "   " }),
      extraction({ company: "Acme" }),
    );
    expect(merge.values.company).toBe("Acme");
    expect(merge.aiFields).toEqual(["company"]);
  });

  it("ignores null extraction values and lists nothing", () => {
    const merge = mergeExtractionIntoForm(EMPTY_FORM_VALUES, NOTHING);
    expect(merge.values).toEqual(EMPTY_FORM_VALUES);
    expect(merge.aiFields).toEqual([]);
  });

  it("does not mutate the input", () => {
    const current = form({ title: "Mi puesto" });
    const snapshot = structuredClone(current);
    mergeExtractionIntoForm(
      current,
      extraction({ company: "Acme", salaryMin: 1000, currency: "USD" }),
    );
    expect(current).toEqual(snapshot);
  });
});

describe("mergeExtractionIntoForm: salary pair", () => {
  it("fills both empty salaries as plain strings", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
    );
    expect(merge.values.salaryMin).toBe("45000");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.aiFields).toEqual(["salaryMin", "salaryMax"]);
  });

  it("does not invert the pair against a minimum the user kept", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "60000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
    );
    expect(merge.values.salaryMin).toBe("60000");
    expect(merge.values.salaryMax).toBe("");
    expect(merge.aiFields).toEqual([]);
  });

  it("fills the maximum when it stays above a kept minimum", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "40000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
    );
    expect(merge.values.salaryMin).toBe("40000");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.aiFields).toEqual(["salaryMax"]);
  });

  it("does not invert the pair against a maximum the user kept", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMax: "30000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
    );
    expect(merge.values.salaryMin).toBe("");
    expect(merge.values.salaryMax).toBe("30000");
    expect(merge.aiFields).toEqual([]);
  });

  it("keeps the decimals of the amount", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000.5 }),
    );
    expect(merge.values.salaryMin).toBe("45000.5");
  });

  it("fills only the side the extraction found", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMax: 55000 }),
    );
    expect(merge.values.salaryMin).toBe("");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.aiFields).toEqual(["salaryMax"]);
  });
});

describe("mergeExtractionIntoForm: currency", () => {
  it("fills the currency with a filled salary", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000, currency: "USD" }),
    );
    expect(merge.values.currency).toBe("USD");
    expect(merge.aiFields).toEqual(["salaryMin", "currency"]);
  });

  it("counts the currency even when it equals the default", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000, currency: "EUR" }),
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toContain("currency");
  });

  it("does not fill a currency when no salary was filled", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ currency: "USD" }),
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual([]);
  });

  it("does not fill a currency when the user kept a salary", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "50000" }),
      extraction({ currency: "USD" }),
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual([]);
  });

  it("does not fill a currency when the user kept a salary and the other side was filled", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "40000" }),
      extraction({ salaryMax: 55000, currency: "USD" }),
    );
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual(["salaryMax"]);
  });

  it("does not fill a currency when the analysis returned none", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000 }),
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual(["salaryMin"]);
  });
});

describe("mergeExtractionIntoForm: missing fields", () => {
  it("lists the empty relevant fields in form order", () => {
    const merge = mergeExtractionIntoForm(EMPTY_FORM_VALUES, NOTHING);
    expect(merge.missingFields).toEqual([
      "title",
      "company",
      "workMode",
      "seniority",
    ]);
  });

  it("lists only what is still empty after the merge", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ title: "Frontend", workMode: "remoto" }),
    );
    expect(merge.missingFields).toEqual(["company", "seniority"]);
  });

  it("counts a whitespace-only value as missing", () => {
    const merge = mergeExtractionIntoForm(
      form({
        title: "Frontend",
        company: "  ",
        workMode: "remoto",
        seniority: "mid",
      }),
      NOTHING,
    );
    expect(merge.missingFields).toEqual(["company"]);
  });

  it("is empty when the relevant set is complete", () => {
    const merge = mergeExtractionIntoForm(
      form({
        title: "Frontend",
        company: "Acme",
        workMode: "remoto",
        seniority: "mid",
      }),
      NOTHING,
    );
    expect(merge.missingFields).toEqual([]);
  });

  it("recalculates from the values at that moment", () => {
    const first = mergeExtractionIntoForm(EMPTY_FORM_VALUES, NOTHING);
    expect(first.missingFields).toContain("seniority");
    const second = mergeExtractionIntoForm(
      { ...first.values, seniority: "senior" },
      NOTHING,
    );
    expect(second.missingFields).not.toContain("seniority");
  });
});

describe("mergeExtractionIntoForm: tags", () => {
  const withTags = (tags: ApplicationFormValues["tags"]) =>
    form({ tags: tags.map((tag) => ({ ...tag })) });

  it("adds the proposed tags after the existing ones, in model order, without duplicates", () => {
    const merge = mergeExtractionIntoForm(
      withTags([{ label: "React", group: "stack" }]),
      extraction({
        tags: [
          { label: "react", group: "stack" },
          { label: "TypeScript", group: "stack" },
          { label: "Inglés B2", group: "language" },
        ],
      }),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "React", group: "stack" },
      { label: "TypeScript", group: "stack" },
      { label: "Inglés B2", group: "language" },
    ]);
    expect(merge.aiTags).toStrictEqual(["typescript", "inglés b2"]);
  });

  it("keeps the user spelling and group when the key already exists", () => {
    const merge = mergeExtractionIntoForm(
      withTags([{ label: "Docker", group: "nice_to_have" }]),
      extraction({ tags: [{ label: "  docker ", group: "stack" }] }),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "Docker", group: "nice_to_have" },
    ]);
    expect(merge.aiTags).toStrictEqual([]);
  });

  it("compares keys ignoring case, extra spaces and Unicode form", () => {
    const merge = mergeExtractionIntoForm(
      withTags([{ label: "Café  Racer", group: "stack" }]),
      extraction({ tags: [{ label: "café racer", group: "stack" }] }),
    );
    expect(merge.values.tags).toHaveLength(1);
    expect(merge.aiTags).toStrictEqual([]);
  });

  it("stops at the cap keeping the user's tags and drops the extra ones", () => {
    const existing = Array.from({ length: 19 }, (_, index) => ({
      label: `Tag ${index}`,
      group: "stack" as const,
    }));
    const merge = mergeExtractionIntoForm(
      withTags(existing),
      extraction({
        tags: [
          { label: "Uno", group: "stack" },
          { label: "Dos", group: "stack" },
          { label: "Tres", group: "stack" },
        ],
      }),
    );
    expect(merge.values.tags).toHaveLength(20);
    expect(merge.values.tags.slice(0, 19)).toStrictEqual(existing);
    expect(merge.aiTags).toStrictEqual(["uno"]);
  });

  it("leaves the tags as they were when the extraction has none", () => {
    const current = withTags([{ label: "React", group: "stack" }]);
    const merge = mergeExtractionIntoForm(current, NOTHING);
    expect(merge.values.tags).toStrictEqual(current.tags);
    expect(merge.aiTags).toStrictEqual([]);
  });

  it("does not mutate the current tags", () => {
    const current = withTags([{ label: "React", group: "stack" }]);
    const snapshot = structuredClone(current);
    mergeExtractionIntoForm(
      current,
      extraction({ tags: [{ label: "Vue", group: "stack" }] }),
    );
    expect(current).toStrictEqual(snapshot);
  });
});
