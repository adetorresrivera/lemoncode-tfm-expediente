// WCAG 2.x contrast over the theme tokens. Pure helpers, no DOM.

export type ThemeTokens = Record<string, string>;

const BLOCK_PATTERNS = {
  light: /:root\s*\{([^}]*)\}/,
  dark: /\.dark\s*\{([^}]*)\}/,
} as const;

// `--name: value;` declarations of one block, without the leading dashes.
function declarations(block: string): ThemeTokens {
  const found: ThemeTokens = {};
  for (const match of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) found[name] = value.trim();
  }
  return found;
}

// `var(--x)` aliases are followed inside the theme being resolved, so `card-foreground: var(--foreground)`
// is the light foreground in light and the dark foreground in dark.
function resolveAliases(raw: ThemeTokens): ThemeTokens {
  const resolve = (value: string, seen: Set<string>): string => {
    const alias = /^var\(--([\w-]+)\)$/.exec(value);
    if (alias?.[1] === undefined) return value;
    const target = raw[alias[1]];
    if (target === undefined || seen.has(alias[1])) return value;
    return resolve(target, new Set(seen).add(alias[1]));
  };

  const resolved: ThemeTokens = {};
  for (const [name, value] of Object.entries(raw)) {
    resolved[name] = resolve(value, new Set([name]));
  }
  return resolved;
}

/** Reads the `:root` (light) and `.dark` blocks of the theme file; `.dark` overlays `:root`. */
export function parseThemeTokens(css: string): {
  light: ThemeTokens;
  dark: ThemeTokens;
} {
  const light = declarations(BLOCK_PATTERNS.light.exec(css)?.[1] ?? "");
  const dark = {
    ...light,
    ...declarations(BLOCK_PATTERNS.dark.exec(css)?.[1] ?? ""),
  };
  return { light: resolveAliases(light), dark: resolveAliases(dark) };
}

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of a `#rrggbb` colour (WCAG 2.x). */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (
    match?.[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined
  ) {
    throw new Error(`Not a #rrggbb colour: ${hex}`);
  }
  const [r, g, b] = [match[1], match[2], match[3]].map((part) =>
    channel(parseInt(part, 16)),
  );
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** Contrast ratio between two colours: lighter over darker, symmetric. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const [lighter, darker] = first >= second ? [first, second] : [second, first];
  return (lighter + 0.05) / (darker + 0.05);
}
