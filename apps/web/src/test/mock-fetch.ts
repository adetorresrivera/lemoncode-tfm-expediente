import { vi } from "vitest";

export type MockHandler = (
  url: URL,
  init: RequestInit | undefined,
) => Response | Promise<Response>;

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const isHandler = (value: unknown): value is MockHandler =>
  typeof value === "function";

const notFound = (): Response =>
  jsonResponse(
    { error: { code: "NOT_FOUND", message: "Recurso no encontrado" } },
    404,
  );

// Stubs the global fetch. Routes are keyed "METHOD /pathname"; a function value is called with
// (url, init), any other value is answered as a 200 JSON body. An unmatched key answers 404,
// except GET /api/tags, which answers an empty list unless the test routes it: the list pod
// always loads the tag options, and tests about other endpoints should not have to know that.
export function mockFetch(routes: Record<string, MockHandler | unknown>) {
  const allRoutes: Record<string, MockHandler | unknown> = {
    "GET /api/tags": [],
    ...routes,
  };
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${url.pathname}`;
    if (!(key in allRoutes)) return notFound();
    const route = allRoutes[key];
    return isHandler(route) ? route(url, init) : jsonResponse(route);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export const installDefaultFetch = () =>
  mockFetch({ "GET /api/applications": [], "GET /api/tags": [] });
