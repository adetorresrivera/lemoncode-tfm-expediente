import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatSalaryRange,
  isoToLocalInput,
  localInputToIso,
} from "./format";

const NBSP = " ";

describe("formatDate", () => {
  it("formats a date with an abbreviated month and a period", () => {
    expect(formatDate("2026-10-12T10:00:00.000Z", "UTC")).toBe("12 oct. 2026");
  });

  it("keeps the period of a longer abbreviation", () => {
    expect(formatDate("2026-09-05T10:00:00.000Z", "UTC")).toBe("5 sept. 2026");
  });
});

describe("formatDateTime", () => {
  it("prints the date with its abbreviated month and a 24-hour time", () => {
    expect(formatDateTime("2026-11-05T09:30:00.000Z", "Europe/Madrid")).toBe(
      "5 nov. 2026, 10:30",
    );
  });

  it("rolls over midnight into the next day and prints 00:00, never 24:00", () => {
    expect(formatDateTime("2026-11-05T23:00:00.000Z", "Europe/Madrid")).toBe(
      "6 nov. 2026, 00:00",
    );
  });

  it("keeps the period of a longer month and pads the time", () => {
    expect(formatDateTime("2026-09-05T06:05:00.000Z", "Europe/Madrid")).toBe(
      "5 sept. 2026, 08:05",
    );
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

// The shared setup only unstubs globals: the zone stubbed here is restored after every case.
describe("localInputToIso and isoToLocalInput", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads a datetime-local value in Europe/Madrid and stores it in UTC", () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    expect(localInputToIso("2026-11-05T10:30")).toBe(
      "2026-11-05T09:30:00.000Z",
    );
  });

  it("reads the same value in America/New_York with its own offset", () => {
    vi.stubEnv("TZ", "America/New_York");
    expect(localInputToIso("2026-11-05T10:30")).toBe(
      "2026-11-05T15:30:00.000Z",
    );
  });

  it("round-trips a minute-precision value in both zones", () => {
    for (const zone of ["Europe/Madrid", "America/New_York"]) {
      vi.stubEnv("TZ", zone);
      expect(isoToLocalInput(localInputToIso("2026-11-05T10:30") ?? "")).toBe(
        "2026-11-05T10:30",
      );
    }
  });

  it("drops seconds and milliseconds on the way back", () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    expect(isoToLocalInput("2026-11-05T09:30:45.123Z")).toBe(
      "2026-11-05T10:30",
    );
  });

  it("moves the Madrid spring-forward gap to the valid instant and reads it back an hour later", () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    const iso = localInputToIso("2026-03-29T02:30");
    expect(iso).toBe("2026-03-29T01:30:00.000Z");
    expect(isoToLocalInput(iso ?? "")).toBe("2026-03-29T03:30");
  });

  it("resolves the Madrid fall-back overlap to its first occurrence", () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    expect(localInputToIso("2026-10-25T02:30")).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it("gives null for an empty or unparsable value", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("nope")).toBeNull();
  });
});
