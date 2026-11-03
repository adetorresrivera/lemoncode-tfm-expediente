// Hono's c.req.queries() returns an array for every key. The Zod query schemas expect a scalar
// for a single value and an array for a repeated key, so this adapter unwraps the singletons.
export function queryInput(
  queries: Record<string, string[]>,
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(queries).map(([key, values]) => [
      key,
      values.length === 1 ? (values[0] as string) : values,
    ]),
  );
}
