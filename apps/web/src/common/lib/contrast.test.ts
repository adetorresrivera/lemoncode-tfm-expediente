import css from "@/styles.css?raw";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseThemeTokens } from "./contrast";

// D-13 (DEMO-04 AA): axe-core cannot run `color-contrast` in jsdom, so every pair of the UI-SPEC
// «Contrast contract» is recomputed here from the theme file itself. A changed token fails the build.

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

// [foreground, background] token names, copied from the UI-SPEC text-pair table.
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "accent"],
  ["primary-foreground", "primary"],
  ["primary", "background"],
  ["primary", "card"],
  ["destructive-foreground", "destructive"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["accent-foreground", "accent"],
  ["secondary-foreground", "secondary"],
  ["brand-parchment", "brand-navy"],
  ["brand-gold-ink", "ai-missing-bg"],
  ["brand-gold-ink", "card"],
  ...["saved", "sent", "interview", "offer", "rejected"].map(
    (status): [string, string] => [`status-${status}`, `status-${status}-bg`],
  ),
];

// Non-text pairs (field borders, focus rings, selected fills).
const NON_TEXT_PAIRS: [string, string][] = [
  ["input", "card"],
  ["input", "background"],
  ["input", "sidebar"],
  ["ring", "background"],
  ["ring", "card"],
  ["sidebar-ring", "sidebar"],
  ["primary", "card"],
];

const tokens = parseThemeTokens(css);

const ratio = (theme: Theme, a: string, b: string): number => {
  const first = tokens[theme][a];
  const second = tokens[theme][b];
  if (first === undefined || second === undefined) {
    throw new Error(`Token missing in the ${theme} theme: ${a} or ${b}`);
  }
  return contrastRatio(first, second);
};

describe("contrastRatio", () => {
  it("is 21 for white on black, and symmetric", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("is 1 for a colour on itself", () => {
    expect(contrastRatio("#1f3a5f", "#1f3a5f")).toBeCloseTo(1, 5);
  });
});

describe("parseThemeTokens", () => {
  it("reads the real theme file (guard against an empty raw import)", () => {
    expect(css).toContain("--background");
  });

  it("resolves hex values for both themes", () => {
    expect(tokens.light["background"]).toBe("#f6f1e6");
    expect(tokens.dark["background"]).toBe("#11151d");
  });

  it("resolves var() aliases inside the theme that declares them", () => {
    expect(tokens.light["card-foreground"]).toBe(tokens.light["foreground"]);
    expect(tokens.dark["card-foreground"]).toBe(tokens.dark["foreground"]);
    expect(tokens.dark["card-foreground"]).not.toBe(
      tokens.light["card-foreground"],
    );
  });

  it("overlays .dark on :root without losing tokens only :root declares", () => {
    expect(tokens.dark["radius"]).toBe(tokens.light["radius"]);
  });
});

describe("contrast contract: documented values", () => {
  it("foreground on background is 13.94 in light and 14.57 in dark", () => {
    expect(ratio("light", "foreground", "background")).toBeCloseTo(13.94, 2);
    expect(ratio("dark", "foreground", "background")).toBeCloseTo(14.57, 2);
  });

  it("primary-foreground on primary is 10.19 in light and 10.08 in dark", () => {
    expect(ratio("light", "primary-foreground", "primary")).toBeCloseTo(
      10.19,
      2,
    );
    expect(ratio("dark", "primary-foreground", "primary")).toBeCloseTo(
      10.08,
      2,
    );
  });
});

describe.each(THEMES)("contrast contract, %s theme", (theme) => {
  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (foreground, bg) => {
    expect(
      ratio(theme, foreground, bg),
      `${foreground} on ${bg}`,
    ).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it.each(NON_TEXT_PAIRS)(
    "non-text %s against %s is at least 3:1",
    (element, surface) => {
      expect(
        ratio(theme, element, surface),
        `${element} against ${surface}`,
      ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    },
  );
});

describe("contrast contract: documented non-passes", () => {
  it("brand-gold on card is below the text threshold in light", () => {
    expect(ratio("light", "brand-gold", "card")).toBeLessThan(TEXT_MIN);
  });

  it("border on background is below the non-text threshold in both themes", () => {
    for (const theme of THEMES) {
      expect(ratio(theme, "border", "background")).toBeLessThan(NON_TEXT_MIN);
    }
  });

  it("destructive on card is below the non-text threshold in dark", () => {
    expect(ratio("dark", "destructive", "card")).toBeLessThan(NON_TEXT_MIN);
  });

  it("ring on sidebar is below the non-text threshold in light", () => {
    expect(ratio("light", "ring", "sidebar")).toBeLessThan(NON_TEXT_MIN);
  });
});

describe("contrast contract: non-passes are not used as foreground in app source", () => {
  // Application components only: the shadcn primitives under /ui/ and the tests are excluded.
  const sources = Object.entries(
    import.meta.glob<string>("/src/**/*.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }),
  ).filter(([path]) => !path.includes("/ui/") && !/\.test\.tsx?$/.test(path));

  const sourceOf = (suffix: string): string => {
    const found = sources.find(([path]) => path.endsWith(suffix));
    if (found === undefined) throw new Error(`Source not found: ${suffix}`);
    return found[1];
  };

  const offenders = (pattern: RegExp): string[] =>
    sources.filter(([, text]) => pattern.test(text)).map(([path]) => path);

  it("scans the application sources", () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  it("has no text-brand-gold class (only text-brand-gold-ink)", () => {
    expect(offenders(/(?<![\w-])(?:[\w-]+:)*text-brand-gold(?![\w-])/)).toEqual(
      [],
    );
  });

  it("has no destructive text tint", () => {
    expect(
      offenders(/(?<![\w-])(?:[\w-]+:)*text-destructive(?![\w-])/),
    ).toEqual([]);
  });

  it("has no ring-ring focus class on the sidebar surfaces", () => {
    // The skip link floats over the page and keeps `focus:ring-ring` (UI-SPEC, Layout); every
    // focus ring on the sidebar, the mobile bar and the theme toggle is `ring-sidebar-ring`.
    const sidebarSurfaces = [
      sourceOf("/layouts/app-layout.tsx"),
      sourceOf("/common/components/theme-toggle.tsx"),
    ].map((text) => text.replaceAll("focus:ring-ring", ""));

    for (const text of sidebarSurfaces) {
      expect(text).not.toMatch(/ring-ring/);
    }
  });
});
