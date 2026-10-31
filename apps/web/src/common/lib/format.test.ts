import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatSalaryRange } from "./format";

const NBSP = " ";

describe("formatDate", () => {
  it("formats a date with an abbreviated month and a period", () => {
    expect(formatDate("2026-10-12T10:00:00.000Z", "UTC")).toBe("12 oct. 2026");
  });

  it("keeps the period of a longer abbreviation", () => {
    expect(formatDate("2026-09-05T10:00:00.000Z", "UTC")).toBe("5 sept. 2026");
  });
});

describe("formatSalaryRange", () => {
  it("prints both bounds with an en dash", () => {
    expect(formatSalaryRange(52000, 65000)).toBe(
      `52.000${NBSP}€ – 65.000${NBSP}€`,
    );
  });

  it("prints «Desde» for a minimum only and «Hasta» for a maximum only", () => {
    expect(formatSalaryRange(52000, null)).toBe(`Desde 52.000${NBSP}€`);
    expect(formatSalaryRange(null, 65000)).toBe(`Hasta 65.000${NBSP}€`);
  });

  it("prints one amount when both bounds are equal", () => {
    expect(formatSalaryRange(52000, 52000)).toBe(`52.000${NBSP}€`);
  });

  it("returns null without bounds", () => {
    expect(formatSalaryRange(null, null)).toBeNull();
    expect(formatSalaryRange(null, null, "USD")).toBeNull();
  });

  it("formats another currency in its own symbol and defaults to the euro", () => {
    expect(formatSalaryRange(52000, null, "USD")).toContain("$");
    expect(formatSalaryRange(52000, null, null)).toContain("€");
  });
});

describe("formatMoney", () => {
  it("groups five-digit amounts and appends the euro sign", () => {
    expect(formatMoney(52000)).toBe(`52.000${NBSP}€`);
  });

  it("groups four-digit amounts too", () => {
    expect(formatMoney(5200)).toBe(`5.200${NBSP}€`);
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe(`0${NBSP}€`);
  });

  it("rounds to whole units", () => {
    expect(formatMoney(52000.4)).toBe(`52.000${NBSP}€`);
  });
});
