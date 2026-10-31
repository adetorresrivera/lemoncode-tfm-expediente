import { describe, expect, it } from "vitest";
import { mockFetch } from "@/test/mock-fetch";
import { getApplications } from "@/pods/application-list/api/api";
import {
  hasActiveFilters,
  isDefaultSort,
  listSearchSchema,
  type ListSearch,
} from "./application-search";
import { parseSearch, stringifySearch } from "./search-params";

describe("parseSearch", () => {
  it("keeps values as strings and turns repeated keys into arrays", () => {
    expect(
      parseSearch("?status=guardada&status=enviada&q=123&tags=React"),
    ).toStrictEqual({
      status: ["guardada", "enviada"],
      q: "123",
      tags: "React",
    });
  });

  it("returns an empty object for an empty search string", () => {
    expect(parseSearch("")).toStrictEqual({});
    expect(parseSearch("?")).toStrictEqual({});
  });

  it("never coerces numbers, booleans or null", () => {
    expect(parseSearch("?a=1&b=true&c=null")).toStrictEqual({
      a: "1",
      b: "true",
      c: "null",
    });
  });
});

describe("stringifySearch", () => {
  it("writes repeated keys in order and skips undefined, null and empty values", () => {
    expect(
      stringifySearch({
        status: ["guardada", "enviada"],
        q: "123",
        tags: undefined,
        gone: null,
        empty: "",
      }),
    ).toBe("?status=guardada&status=enviada&q=123");
  });

  it("returns an empty string when nothing is left", () => {
    expect(stringifySearch({})).toBe("");
    expect(stringifySearch({ q: undefined })).toBe("");
  });

  it("percent-encodes special characters and round-trips them", () => {
    const search = { tags: ["C#", ".NET 8"] };
    const text = stringifySearch(search);
    expect(text).toContain("C%23");
    expect(parseSearch(text)).toStrictEqual(search);
  });
});

describe("listSearchSchema", () => {
  it("degrades invalid values to not applied and the default sort", () => {
    expect(
      listSearchSchema.parse({ status: "foo", sort: "title", q: "" }),
    ).toEqual({ status: undefined, q: undefined, sort: "updatedAt" });
  });

  it("wraps a single status in an array and keeps q as text", () => {
    const parsed = listSearchSchema.parse({ status: "enviada", q: "123" });
    expect(parsed.status).toStrictEqual(["enviada"]);
    expect(parsed.q).toBe("123");
  });

  it("keeps the valid filters when another one is invalid", () => {
    const parsed = listSearchSchema.parse({
      status: ["enviada", "rechazada"],
      workMode: "nowhere",
      seniority: "senior",
    });
    expect(parsed.status).toStrictEqual(["enviada", "rechazada"]);
    expect(parsed.workMode).toBeUndefined();
    expect(parsed.seniority).toBe("senior");
  });

  it("keeps the order in which repeated values were given", () => {
    const parsed = listSearchSchema.parse({
      status: ["rechazada", "enviada"],
      tags: ["React", "Docker", "C#"],
    });
    expect(parsed.status).toStrictEqual(["rechazada", "enviada"]);
    expect(parsed.tags).toStrictEqual(["React", "Docker", "C#"]);
  });

  it("degrades a tag list with an empty item and a blank q", () => {
    const parsed = listSearchSchema.parse({ q: "   ", tags: ["React", ""] });
    expect(parsed.q).toBeUndefined();
    expect(parsed.tags).toBeUndefined();
  });
});

describe("list search helpers", () => {
  const base: ListSearch = { sort: "updatedAt" };

  it("hasActiveFilters is false for the sort alone", () => {
    expect(hasActiveFilters({ sort: "appliedAt" })).toBe(false);
    expect(hasActiveFilters(base)).toBe(false);
  });

  it.each([
    ["q", { ...base, q: "acme" }],
    ["status", { ...base, status: ["enviada" as const] }],
    ["tags", { ...base, tags: ["React"] }],
    ["workMode", { ...base, workMode: "remoto" as const }],
    ["seniority", { ...base, seniority: "senior" as const }],
  ])("hasActiveFilters is true when %s is set", (_, search) => {
    expect(hasActiveFilters(search)).toBe(true);
  });

  it("isDefaultSort tells the default sort apart", () => {
    expect(isDefaultSort({ sort: "updatedAt" })).toBe(true);
    expect(isDefaultSort({ sort: "appliedAt" })).toBe(false);
  });
});

describe("getApplications query", () => {
  const requestedUrl = (fetchMock: ReturnType<typeof mockFetch>) => {
    const raw = fetchMock.mock.calls[0]?.[0];
    return new URL(String(raw), "http://localhost");
  };

  it("sends only the known keys, repeating status and tags in order", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [] });
    await getApplications({
      status: ["enviada", "rechazada"],
      tags: ["React", "C#"],
      workMode: "remoto",
      seniority: "senior",
      q: "acme",
      sort: "appliedAt",
    });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/api/applications");
    expect(url.searchParams.getAll("status")).toStrictEqual([
      "enviada",
      "rechazada",
    ]);
    expect(url.searchParams.getAll("tags")).toStrictEqual(["React", "C#"]);
    expect(url.searchParams.get("workMode")).toBe("remoto");
    expect(url.searchParams.get("seniority")).toBe("senior");
    expect(url.searchParams.get("q")).toBe("acme");
    expect(url.searchParams.get("sort")).toBe("appliedAt");
  });

  it("requests status, q and sort only when the rest is unset", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [] });
    await getApplications({
      status: ["enviada"],
      q: "acme",
      sort: "updatedAt",
    });

    expect(requestedUrl(fetchMock).search).toBe(
      "?status=enviada&q=acme&sort=updatedAt",
    );
  });

  it("does not forward unknown runtime keys", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [] });
    const hostile = {
      sort: "updatedAt",
      "status[$ne]": "x",
      __proto__: { polluted: "1" },
    } as ListSearch;
    await getApplications(hostile);

    const url = requestedUrl(fetchMock);
    expect(url.search).toBe("?sort=updatedAt");
    expect(url.searchParams.has("status[$ne]")).toBe(false);
  });
});
