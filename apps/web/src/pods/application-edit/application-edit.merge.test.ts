import type { OfferExtraction } from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import { mergeExtractionIntoForm } from "./application-edit.mapper";
import {
  EMPTY_FORM_VALUES,
  type AiFillableField,
  type ApplicationFormValues,
} from "./application-edit.vm";

const ANALYZED_TEXT =
  "Oferta analizada: Frontend en Acme, remoto, 45.000 a 55.000 EUR.";

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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
    );
    expect(merge.values.company).toBe("Acme");
    expect(merge.aiFields).toEqual(["company"]);
  });

  it("ignores null extraction values and lists nothing", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      NOTHING,
      ANALYZED_TEXT,
    );
    expect(merge.values).toEqual({
      ...EMPTY_FORM_VALUES,
      offerText: ANALYZED_TEXT,
    });
    expect(merge.aiFields).toEqual([]);
  });

  it("sets offerText to the analyzed text even when another text was stored", () => {
    const merge = mergeExtractionIntoForm(
      form({ offerText: "Texto anterior" }),
      NOTHING,
      ANALYZED_TEXT,
    );
    expect(merge.values.offerText).toBe(ANALYZED_TEXT);
  });

  it("never lists offerText among the AI-filled fields", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ title: "Frontend", company: "Acme" }),
      ANALYZED_TEXT,
    );
    expect(merge.aiFields).not.toContain("offerText");
    expect(merge.values.offerText).toBe(ANALYZED_TEXT);
  });

  it("does not mutate the input", () => {
    const current = form({ title: "Mi puesto" });
    const snapshot = structuredClone(current);
    mergeExtractionIntoForm(
      current,
      extraction({ company: "Acme", salaryMin: 1000, currency: "USD" }),
      ANALYZED_TEXT,
    );
    expect(current).toEqual(snapshot);
  });
});

describe("mergeExtractionIntoForm: salary pair", () => {
  it("fills both empty salaries as plain strings", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMin).toBe("45000");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.aiFields).toEqual(["salaryMin", "salaryMax"]);
  });

  it("does not invert the pair against a minimum the user kept", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "60000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMin).toBe("60000");
    expect(merge.values.salaryMax).toBe("");
    expect(merge.aiFields).toEqual([]);
  });

  it("fills the maximum when it stays above a kept minimum", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "40000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMin).toBe("40000");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.aiFields).toEqual(["salaryMax"]);
  });

  it("does not invert the pair against a maximum the user kept", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMax: "30000" }),
      extraction({ salaryMin: 45000, salaryMax: 55000 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMin).toBe("");
    expect(merge.values.salaryMax).toBe("30000");
    expect(merge.aiFields).toEqual([]);
  });

  it("keeps the decimals of the amount", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000.5 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMin).toBe("45000.5");
  });

  it("fills only the side the extraction found", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMax: 55000 }),
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
    );
    expect(merge.values.currency).toBe("USD");
    expect(merge.aiFields).toEqual(["salaryMin", "currency"]);
  });

  it("counts the currency even when it equals the default", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000, currency: "EUR" }),
      ANALYZED_TEXT,
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toContain("currency");
  });

  it("does not fill a currency when no salary was filled", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ currency: "USD" }),
      ANALYZED_TEXT,
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual([]);
  });

  it("does not fill a currency when the user kept a salary", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "50000" }),
      extraction({ currency: "USD" }),
      ANALYZED_TEXT,
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual([]);
  });

  it("does not fill a currency when the user kept a salary and the other side was filled", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "40000" }),
      extraction({ salaryMax: 55000, currency: "USD" }),
      ANALYZED_TEXT,
    );
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual(["salaryMax"]);
  });

  it("does not fill a currency when the analysis returned none", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      extraction({ salaryMin: 45000 }),
      ANALYZED_TEXT,
    );
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual(["salaryMin"]);
  });
});

describe("mergeExtractionIntoForm: missing fields", () => {
  it("lists the empty relevant fields in form order", () => {
    const merge = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      NOTHING,
      ANALYZED_TEXT,
    );
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
    );
    expect(merge.missingFields).toEqual([]);
  });

  it("recalculates from the values at that moment", () => {
    const first = mergeExtractionIntoForm(
      EMPTY_FORM_VALUES,
      NOTHING,
      ANALYZED_TEXT,
    );
    expect(first.missingFields).toContain("seniority");
    const second = mergeExtractionIntoForm(
      { ...first.values, seniority: "senior" },
      NOTHING,
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
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
      ANALYZED_TEXT,
    );
    expect(merge.values.tags).toHaveLength(20);
    expect(merge.values.tags.slice(0, 19)).toStrictEqual(existing);
    expect(merge.aiTags).toStrictEqual(["uno"]);
  });

  it("leaves the tags as they were when the extraction has none", () => {
    const current = withTags([{ label: "React", group: "stack" }]);
    const merge = mergeExtractionIntoForm(current, NOTHING, ANALYZED_TEXT);
    expect(merge.values.tags).toStrictEqual(current.tags);
    expect(merge.aiTags).toStrictEqual([]);
  });

  it("does not mutate the current tags", () => {
    const current = withTags([{ label: "React", group: "stack" }]);
    const snapshot = structuredClone(current);
    mergeExtractionIntoForm(
      current,
      extraction({ tags: [{ label: "Vue", group: "stack" }] }),
      ANALYZED_TEXT,
    );
    expect(current).toStrictEqual(snapshot);
  });
});

const marked = (
  fields: AiFillableField[],
  tags: string[] = [],
): { aiFields: ReadonlySet<AiFillableField>; aiTags: ReadonlySet<string> } => ({
  aiFields: new Set(fields),
  aiTags: new Set(tags),
});

describe("mergeExtractionIntoForm: re-analysis of fields", () => {
  it("replaces a field still marked IA", () => {
    const merge = mergeExtractionIntoForm(
      form({ title: "Frontend" }),
      extraction({ title: "Backend" }),
      ANALYZED_TEXT,
      marked(["title"]),
    );
    expect(merge.values.title).toBe("Backend");
    expect(merge.aiFields).toEqual(["title"]);
  });

  it("clears a marked field the new extraction lacks", () => {
    const merge = mergeExtractionIntoForm(
      form({ company: "Acme", workMode: "remoto" }),
      NOTHING,
      ANALYZED_TEXT,
      marked(["company", "workMode"]),
    );
    expect(merge.values.company).toBe("");
    expect(merge.values.workMode).toBe("");
    expect(merge.aiFields).toEqual([]);
    expect(merge.missingFields).toContain("company");
    expect(merge.missingFields).toContain("workMode");
  });

  it("keeps a filled field without the mark", () => {
    const merge = mergeExtractionIntoForm(
      form({ title: "Mi puesto" }),
      extraction({ title: "Otro" }),
      ANALYZED_TEXT,
      marked([]),
    );
    expect(merge.values.title).toBe("Mi puesto");
    expect(merge.aiFields).toEqual([]);
  });

  it("replaces the marked salary range and currency", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "45000", salaryMax: "55000", currency: "USD" }),
      extraction({ salaryMin: 50000, salaryMax: 60000, currency: "GBP" }),
      ANALYZED_TEXT,
      marked(["salaryMin", "salaryMax", "currency"]),
    );
    expect(merge.values).toMatchObject({
      salaryMin: "50000",
      salaryMax: "60000",
      currency: "GBP",
    });
    expect(merge.aiFields).toEqual(["salaryMin", "salaryMax", "currency"]);
  });

  it("resets the marked salary range and currency when the new extraction has no salary", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "45000", salaryMax: "55000", currency: "USD" }),
      NOTHING,
      ANALYZED_TEXT,
      marked(["salaryMin", "salaryMax", "currency"]),
    );
    expect(merge.values).toMatchObject({
      salaryMin: "",
      salaryMax: "",
      currency: "EUR",
    });
    expect(merge.aiFields).toEqual([]);
  });

  it("keeps the inversion guard against a user maximum", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "45000", salaryMax: "30000", currency: "USD" }),
      extraction({ salaryMin: 50000, salaryMax: 60000, currency: "GBP" }),
      ANALYZED_TEXT,
      marked(["salaryMin"]),
    );
    expect(merge.values.salaryMin).toBe("");
    expect(merge.values.salaryMax).toBe("30000");
    expect(merge.values.currency).toBe("USD");
    expect(merge.aiFields).toEqual([]);
  });

  it("resets a marked currency when a salary side belongs to the user", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "45000", salaryMax: "55000", currency: "GBP" }),
      extraction({ salaryMin: 40000, currency: "USD" }),
      ANALYZED_TEXT,
      marked(["salaryMin", "currency"]),
    );
    expect(merge.values.salaryMin).toBe("40000");
    expect(merge.values.salaryMax).toBe("55000");
    expect(merge.values.currency).toBe("EUR");
    expect(merge.aiFields).toEqual(["salaryMin"]);
  });

  it("keeps an unmarked currency next to marked salaries", () => {
    const merge = mergeExtractionIntoForm(
      form({ salaryMin: "45000", salaryMax: "55000", currency: "EUR" }),
      extraction({ salaryMin: 50000, salaryMax: 60000, currency: "GBP" }),
      ANALYZED_TEXT,
      marked(["salaryMin", "salaryMax"]),
    );
    expect(merge.values).toMatchObject({
      salaryMin: "50000",
      salaryMax: "60000",
      currency: "EUR",
    });
    expect(merge.aiFields).toEqual(["salaryMin", "salaryMax"]);
  });

  it("does not mutate the current values nor the previous marks", () => {
    const current = form({ title: "Frontend", tags: [] });
    const snapshot = structuredClone(current);
    const previous = marked(["title"], ["react"]);
    mergeExtractionIntoForm(
      current,
      extraction({ title: "Backend" }),
      ANALYZED_TEXT,
      previous,
    );
    expect(current).toStrictEqual(snapshot);
    expect(previous.aiFields.size).toBe(1);
    expect(previous.aiTags.size).toBe(1);
  });
});

describe("mergeExtractionIntoForm: re-analysis of tags", () => {
  const withTags = (tags: ApplicationFormValues["tags"]) =>
    form({ tags: tags.map((tag) => ({ ...tag })) });

  it("replaces the marked chips and keeps the user's first", () => {
    const merge = mergeExtractionIntoForm(
      withTags([
        { label: "React", group: "stack" },
        { label: "Vue", group: "stack" },
      ]),
      extraction({ tags: [{ label: "Angular", group: "stack" }] }),
      ANALYZED_TEXT,
      marked([], ["vue"]),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "React", group: "stack" },
      { label: "Angular", group: "stack" },
    ]);
    expect(merge.aiTags).toStrictEqual(["angular"]);
  });

  it("brings a re-proposed marked chip back in the new spelling and group, still marked", () => {
    const merge = mergeExtractionIntoForm(
      withTags([{ label: "React", group: "stack" }]),
      extraction({ tags: [{ label: "react", group: "nice_to_have" }] }),
      ANALYZED_TEXT,
      marked([], ["react"]),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "react", group: "nice_to_have" },
    ]);
    expect(merge.aiTags).toStrictEqual(["react"]);
  });

  it("removes the marked chips when the new extraction has none", () => {
    const merge = mergeExtractionIntoForm(
      withTags([
        { label: "Node", group: "stack" },
        { label: "Vue", group: "stack" },
      ]),
      NOTHING,
      ANALYZED_TEXT,
      marked([], ["vue"]),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "Node", group: "stack" },
    ]);
    expect(merge.aiTags).toStrictEqual([]);
  });

  it("lets the user's chip win on a duplicate key", () => {
    const merge = mergeExtractionIntoForm(
      withTags([
        { label: "Docker", group: "nice_to_have" },
        { label: "Vue", group: "stack" },
      ]),
      extraction({
        tags: [
          { label: "docker", group: "stack" },
          { label: "Go", group: "stack" },
        ],
      }),
      ANALYZED_TEXT,
      marked([], ["vue"]),
    );
    expect(merge.values.tags).toStrictEqual([
      { label: "Docker", group: "nice_to_have" },
      { label: "Go", group: "stack" },
    ]);
    expect(merge.aiTags).toStrictEqual(["go"]);
  });

  it("frees the slots of the dropped AI chips under the cap", () => {
    const user = Array.from({ length: 19 }, (_, index) => ({
      label: `Tag${index}`,
      group: "stack" as const,
    }));
    const merge = mergeExtractionIntoForm(
      withTags([...user, { label: "Vue", group: "stack" }]),
      extraction({
        tags: [
          { label: "Uno", group: "stack" },
          { label: "Dos", group: "stack" },
          { label: "Tres", group: "stack" },
        ],
      }),
      ANALYZED_TEXT,
      marked([], ["vue"]),
    );
    expect(merge.values.tags).toHaveLength(20);
    expect(merge.values.tags.slice(0, 19)).toStrictEqual(user);
    expect(merge.values.tags[19]).toStrictEqual({
      label: "Uno",
      group: "stack",
    });
    expect(merge.aiTags).toStrictEqual(["uno"]);
  });
});
