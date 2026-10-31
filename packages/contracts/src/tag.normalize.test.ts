import { describe, expect, it } from "vitest";
import { MAX_TAGS, tagSchema } from "./tag.schema.js";
import { normalizeTagLabel, normalizeTags, tagKey } from "./tag.normalize.js";

describe("normalizeTagLabel", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizeTagLabel("  React \t  Native  ")).toBe("React Native");
  });

  it("composes to NFC", () => {
    expect(normalizeTagLabel("Café")).toBe("Café");
  });
});

describe("tagKey", () => {
  it("lower-cases accented and non-ASCII letters", () => {
    expect(tagKey("  Éxito  ")).toBe("éxito");
    expect(tagKey("ÑANDÚ")).toBe(tagKey("ñandú"));
  });
});

describe("normalizeTags", () => {
  it("merges case-insensitive duplicates across groups keeping the first spelling and group", () => {
    expect(
      normalizeTags([
        { label: "  React ", group: "stack" },
        { label: "react", group: "nice_to_have" },
        { label: "React   Native", group: "stack" },
      ]),
    ).toStrictEqual([
      { label: "React", group: "stack" },
      { label: "React Native", group: "stack" },
    ]);
  });

  it("keeps «React» and «React Native» as two tags", () => {
    expect(
      normalizeTags([
        { label: "React", group: "stack" },
        { label: "React Native", group: "stack" },
        { label: "REACT", group: "stack" },
      ]),
    ).toHaveLength(2);
  });

  it("dedupes composed and decomposed forms as one", () => {
    expect(
      normalizeTags([
        { label: "Café", group: "stack" },
        { label: "Café", group: "stack" },
      ]),
    ).toStrictEqual([{ label: "Café", group: "stack" }]);
  });

  it("keeps «C#» and «.NET 8» verbatim", () => {
    const tags = [
      { label: "C#", group: "stack" as const },
      { label: ".NET 8", group: "stack" as const },
    ];
    expect(normalizeTags(tags)).toStrictEqual(tags);
  });

  it("drops whitespace-only labels and keeps an empty list empty", () => {
    expect(normalizeTags([{ label: "   ", group: "stack" }])).toStrictEqual([]);
    expect(normalizeTags([])).toStrictEqual([]);
  });

  it("keeps the order of first occurrence", () => {
    expect(
      normalizeTags([
        { label: "Zod", group: "stack" },
        { label: "Angular", group: "stack" },
        { label: "zod", group: "stack" },
        { label: "Docker", group: "nice_to_have" },
      ]).map((t) => t.label),
    ).toStrictEqual(["Zod", "Angular", "Docker"]);
  });

  it("keeps the first 20 of 25 distinct labels", () => {
    const tags = Array.from({ length: 25 }, (_, i) => ({
      label: `Tag ${i + 1}`,
      group: "stack" as const,
    }));
    const result = normalizeTags(tags);
    expect(result).toHaveLength(MAX_TAGS);
    expect(result[19]?.label).toBe("Tag 20");
  });

  it("never truncates: a label over 40 characters stays whole and the schema rejects it", () => {
    const long = "x".repeat(41);
    const [tag] = normalizeTags([{ label: long, group: "stack" }]);
    expect(tag?.label).toBe(long);
    expect(tagSchema.safeParse(tag).success).toBe(false);
  });
});
