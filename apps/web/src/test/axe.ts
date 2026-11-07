import axe, { type Result } from "axe-core";

// D-13: axe-core over the rendered DOM. jsdom has no layout engine, so `color-contrast` cannot be
// evaluated here; the design tokens are proved AA from the CSS itself in common/lib/contrast.test.ts.
export async function checkA11y(
  root: Element = document.documentElement,
): Promise<Result[]> {
  // jsdom has no document language; `index.html` has `lang="es"`.
  document.documentElement.lang = "es";
  const results = await axe.run(root, {
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations;
}

// A readable failure: the rule and the selectors that broke it.
export const summarizeViolations = (
  violations: Result[],
): { id: string; targets: string[] }[] =>
  violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
