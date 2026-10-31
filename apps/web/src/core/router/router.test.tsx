import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { applicationSchema } from "@tfm/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { createAppRouter } from "./router";

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

const stored = applicationSchema.parse({
  id: "a1",
  title: "Frontend Developer",
  company: "Lemoncode",
  status: "guardada",
  statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
  interviews: [],
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ownerId: null,
});

describe("app router", () => {
  it("redirects / to /applications and lists the stored applications", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Frontend Developer")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });

  it("shows the empty text when there are no applications", async () => {
    mockFetch({ "GET /api/applications": [] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it("renders the scene header and eyebrow at /applications", async () => {
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByText("Expediente"),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });
});

const firstRequestUrl = (fetchMock: ReturnType<typeof mockFetch>): URL => {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error("fetch was not called");
  return new URL(String(call[0]), "http://localhost");
};

describe("list state in the URL", () => {
  it("issues the same query after a reload of the same URL", async () => {
    const queries: string[] = [];
    for (let reload = 0; reload < 2; reload += 1) {
      const fetchMock = mockFetch({ "GET /api/applications": [stored] });
      const router = createAppRouter(
        createMemoryHistory({
          initialEntries: ["/applications?status=enviada&q=acme"],
        }),
      );
      const view = render(<RouterProvider router={router} />);

      expect(await screen.findByText("Frontend Developer")).toBeInTheDocument();
      const url = firstRequestUrl(fetchMock);
      expect(url.searchParams.getAll("status")).toStrictEqual(["enviada"]);
      expect(url.searchParams.get("q")).toBe("acme");
      queries.push(url.search);
      view.unmount();
    }
    expect(queries[0]).toBe(queries[1]);
  });

  it("keeps a numeric search as text in the field and in the API query", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications?q=123"] }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Frontend Developer");
    expect(firstRequestUrl(fetchMock).searchParams.get("q")).toBe("123");
  });

  it("keeps the order of repeated values in the API query", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: [
          "/applications?status=rechazada&status=enviada&tags=React&tags=Docker",
        ],
      }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Frontend Developer");
    const url = firstRequestUrl(fetchMock);
    expect(url.searchParams.getAll("status")).toStrictEqual([
      "rechazada",
      "enviada",
    ]);
    expect(url.searchParams.getAll("tags")).toStrictEqual(["React", "Docker"]);
  });

  it("renders the list unfiltered for hostile search params and never an error screen", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: [
          "/applications?status=foo&sort=title&q=&status%5B%24ne%5D=x",
        ],
      }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(firstRequestUrl(fetchMock).search).toBe("?sort=updatedAt");
  });

  it("treats /applications?sort=updatedAt as /applications and strips the default sort", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications?sort=updatedAt"] }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Frontend Developer");
    expect(router.state.location.search).not.toHaveProperty("sort");
    expect(router.state.location.href).toBe("/applications");
  });

  it("renders only the response of the current query when the query changes in flight", async () => {
    const release = new Map<string, () => void>();
    const bodies: Record<string, unknown> = {
      a: [{ ...stored, id: "a1", title: "Answer for A" }],
      b: [{ ...stored, id: "b1", title: "Answer for B" }],
    };
    const fetchMock = mockFetch({
      "GET /api/applications": (url: URL) =>
        new Promise<Response>((resolve) => {
          const q = url.searchParams.get("q") ?? "";
          release.set(q, () => resolve(jsonResponse(bodies[q])));
        }),
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications?q=a"] }),
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(release.has("a")).toBe(true));

    await act(async () => {
      await router.navigate({ to: "/applications", search: { q: "b" } });
    });
    await waitFor(() => expect(release.has("b")).toBe(true));

    act(() => release.get("b")?.());
    expect(await screen.findByText("Answer for B")).toBeInTheDocument();
    act(() => release.get("a")?.());
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Answer for B")).toBeInTheDocument();
    expect(screen.queryByText("Answer for A")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
