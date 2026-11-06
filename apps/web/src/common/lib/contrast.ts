// WCAG 2.x contrast over the theme tokens. Pure helpers, no DOM.
// RED stub: replaced by the implementation in the next commit.

export type ThemeTokens = Record<string, string>;

export function parseThemeTokens(css: string): {
  light: ThemeTokens;
  dark: ThemeTokens;
} {
  void css;
  return { light: {}, dark: {} };
}

export function relativeLuminance(hex: string): number {
  void hex;
  return Number.NaN;
}

export function contrastRatio(a: string, b: string): number {
  void a;
  void b;
  return Number.NaN;
}
