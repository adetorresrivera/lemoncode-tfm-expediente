import { applicationSchema } from "@tfm/contracts";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListSearch } from "@/core/router/application-search";
import { createAppRouter } from "@/core/router/router";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationListComponent } from "./application-list.component";
import { ApplicationListContainer } from "./application-list.container";
import { useApplicationList, useStackTags } from "./application-list.hooks";
import {
  mapApplicationFromApiToVm,
  mapApplicationListFromApiToVm,
  mapStackTagsFromApiToVm,
} from "./application-list.mapper";

const defaultQuery: ListSearch = { sort: "updatedAt" };

// The scene supplies the real router link; pod tests use a plain anchor.
const renderApplicationLink = (link: {
  applicationId: string;
  className?: string;
  children: ReactNode;
}) => (
  <a href={`/applications/${link.applicationId}`} className={link.className}>
    {link.children}
  </a>
);

const renderCreateLink = (link: {
  className?: string;
  children: ReactNode;
}) => (
  <a href="/applications/new" className={link.className}>
    {link.children}
  </a>
);

const listProps = {
  query: defaultQuery,
  onQueryChange: () => {},
  onClearFilters: () => {},
  renderApplicationLink,
  renderCreateLink,
};

const panelProps = {
  query: defaultQuery,
  onQueryChange: () => {},
  onClear: () => {},
  clearCount: 0,
  stackTags: { status: "ok" as const, options: [] },
  onRetryStackTags: () => {},
  renderApplicationLink,
  renderCreateLink,
};

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

const makeApplication = (id: string, title: string, company: string) =>
  applicationSchema.parse({
    id,
    title,
    company,
    status: "guardada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ownerId: null,
  });

const application = makeApplication("a1", "Frontend Developer", "Lemoncode");

const makeFull = (overrides: Record<string, unknown>) =>
  applicationSchema.parse({
    ...application,
    ...overrides,
  });

const tag = (label: string, group: "stack" | "nice_to_have" | "language") => ({
  label,
  group,
});

describe("application-list mapper", () => {
  it("maps an API application to exactly the view-model fields", () => {
    expect(mapApplicationFromApiToVm(application)).toStrictEqual({
      id: "a1",
      title: "Frontend Developer",
      company: "Lemoncode",
      location: null,
      status: "guardada",
      visibleTags: [],
      hiddenTagCount: 0,
      salary: null,
      updatedAtLabel: "12 oct. 2026",
    });
  });

  it("orders tags stack, nice_to_have, language, takes 3 and counts the rest", () => {
    const vm = mapApplicationFromApiToVm(
      makeFull({
        location: "Madrid",
        salaryMin: 52000,
        salaryMax: 65000,
        tags: [
          tag("Inglés", "language"),
          tag("React", "stack"),
          tag("Docker", "nice_to_have"),
          tag("Node.js", "stack"),
          tag("Vite", "stack"),
        ],
      }),
    );

    expect(vm.visibleTags).toStrictEqual([
      { label: "React", soft: false },
      { label: "Node.js", soft: false },
      { label: "Vite", soft: false },
    ]);
    expect(vm.hiddenTagCount).toBe(2);
    expect(vm.location).toBe("Madrid");
    expect(vm.salary).toBe("52.000\u00a0€ – 65.000\u00a0€");
  });

  it("marks nice_to_have tags soft and shows no counter for exactly 3 tags", () => {
    const vm = mapApplicationFromApiToVm(
      makeFull({
        tags: [
          tag("Inglés", "language"),
          tag("Docker", "nice_to_have"),
          tag("React", "stack"),
        ],
      }),
    );

    expect(vm.visibleTags).toStrictEqual([
      { label: "React", soft: false },
      { label: "Docker", soft: true },
      { label: "Inglés", soft: false },
    ]);
    expect(vm.hiddenTagCount).toBe(0);
  });

  it("counts one hidden tag for exactly 4 tags", () => {
    const vm = mapApplicationFromApiToVm(
      makeFull({
        tags: ["A1", "B2", "C3", "D4"].map((label) => tag(label, "stack")),
      }),
    );
    expect(vm.hiddenTagCount).toBe(1);
  });

  it("maps an empty list to an empty list", () => {
    expect(mapApplicationListFromApiToVm([])).toStrictEqual([]);
  });

  it("maps every element of the list", () => {
    expect(mapApplicationListFromApiToVm([application])).toHaveLength(1);
  });
});

describe("ApplicationListContainer", () => {
  it("renders the applications in the exact order of the API response", async () => {
    mockFetch({
      "GET /api/applications": [
        makeApplication("b2", "Zeta Engineer", "Zeta"),
        makeApplication("a1", "Alpha Engineer", "Alpha"),
      ],
    });
    render(<ApplicationListContainer {...listProps} />);

    expect(within(resultsRegion()).getByRole("status")).toHaveTextContent(
      "Cargando candidaturas…",
    );
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Zeta Engineer");
    expect(items[1]).toHaveTextContent("Alpha Engineer");
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows the empty text and no list for an empty response", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(<ApplicationListContainer {...listProps} />);

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("offers «Reintentar» after a server error and refetches exactly once per click", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
              500,
            )
          : jsonResponse([application]);
      },
    });
    render(<ApplicationListContainer {...listProps} />);

    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(countCalls(fetchMock, "/api/applications")).toBe(1);

    await userEvent.click(retry);

    expect(await screen.findByRole("listitem")).toHaveTextContent(
      "Frontend Developer",
    );
    expect(countCalls(fetchMock, "/api/applications")).toBe(2);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Reintentar" }),
      ).not.toBeInTheDocument(),
    );
  });
});

const ERROR_HEADING = "No se pudieron cargar las candidaturas";
const NETWORK_BODY =
  "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
const INVALID_BODY =
  "El servidor respondió algo inesperado. Inténtalo de nuevo.";
const OTHER_BODY = "Algo ha fallado. Inténtalo de nuevo.";

const getCounter = () =>
  document.querySelector<HTMLElement>('p[aria-live="polite"]');

const resultsRegion = () => screen.getByRole("region", { name: "Resultados" });

// The pod also loads GET /api/tags, so call counts are per endpoint.
const countCalls = (fetchMock: ReturnType<typeof mockFetch>, path: string) =>
  fetchMock.mock.calls.filter(([input]) => String(input).includes(path)).length;

describe("ApplicationListContainer loading state", () => {
  it("shows a status region with three hidden skeleton cards and an empty counter during the first load", () => {
    mockFetch({
      "GET /api/applications": () => new Promise<Response>(() => {}),
    });
    render(<ApplicationListContainer {...listProps} />);

    const status = within(resultsRegion()).getByRole("status");
    expect(status).toHaveTextContent("Cargando candidaturas…");
    const skeletons = status.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    skeletons.forEach((node) =>
      expect(node).toHaveAttribute("aria-hidden", "true"),
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(getCounter()).toHaveTextContent("");
  });
});

describe("ApplicationListContainer error state", () => {
  it.each([
    [
      "a network failure",
      () => Promise.reject(new TypeError("offline")),
      NETWORK_BODY,
    ],
    [
      "an unexpected payload",
      () => jsonResponse({ unexpected: true }),
      INVALID_BODY,
    ],
    [
      "a not-found answer",
      () =>
        jsonResponse(
          { error: { code: "NOT_FOUND", message: "Server leak" } },
          404,
        ),
      OTHER_BODY,
    ],
  ])(
    "shows fixed copy for %s and never the server message",
    async (_, handler, body) => {
      mockFetch({ "GET /api/applications": handler });
      render(<ApplicationListContainer {...listProps} />);

      const alert = await screen.findByRole("alert");
      expect(
        within(alert).getByRole("heading", { name: ERROR_HEADING }),
      ).toBeInTheDocument();
      expect(alert).toHaveTextContent(body);
      expect(alert).not.toHaveTextContent("Server leak");
      expect(getCounter()).toHaveTextContent("");
    },
  );

  it("moves focus to the results region when «Reintentar» is clicked", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "x" } },
              500,
            )
          : new Promise<Response>(() => {});
      },
    });
    render(<ApplicationListContainer {...listProps} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Reintentar" }),
    );

    expect(countCalls(fetchMock, "/api/applications")).toBe(2);
    expect(screen.getByRole("region", { name: "Resultados" })).toHaveFocus();
  });
});

describe("ApplicationListContainer counter", () => {
  it("reads «Sin candidaturas» for an empty list", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(<ApplicationListContainer {...listProps} />);

    await screen.findByText(EMPTY_TEXT);
    expect(getCounter()).toHaveTextContent("Sin candidaturas");
  });

  it("reads «1 candidatura» for exactly one application", async () => {
    mockFetch({ "GET /api/applications": [application] });
    render(<ApplicationListContainer {...listProps} />);

    await screen.findByRole("listitem");
    expect(getCounter()).toHaveTextContent(/^1 candidatura$/);
  });

  it("reads «3 candidaturas» for three applications", async () => {
    mockFetch({
      "GET /api/applications": [
        makeApplication("a1", "One", "A"),
        makeApplication("a2", "Two", "B"),
        makeApplication("a3", "Three", "C"),
      ],
    });
    render(<ApplicationListContainer {...listProps} />);

    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(3),
    );
    expect(getCounter()).toHaveTextContent("3 candidaturas");
  });
});

describe("stale-while-refresh", () => {
  it("keeps the previous items and flags the region busy while a retry is in flight", async () => {
    let calls = 0;
    mockFetch({
      "GET /api/applications": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse([application])
          : new Promise<Response>(() => {});
      },
    });
    const { result } = renderHook(() => useApplicationList(defaultQuery));
    await waitFor(() => expect(result.current.status).toBe("ok"));

    act(() => result.current.retry());

    expect(result.current.refreshing).toBe(true);
    expect(result.current.applications).toHaveLength(1);
  });

  it("renders the previous cards with aria-busy and no skeleton while refreshing", () => {
    render(
      <ApplicationListComponent
        status="loading"
        applications={[mapApplicationFromApiToVm(application)]}
        errorCode={null}
        refreshing
        onRetry={() => {}}
        {...panelProps}
      />,
    );

    expect(screen.getByRole("region", { name: "Resultados" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(resultsRegion()).queryByRole("status"),
    ).not.toBeInTheDocument();
    expect(getCounter()).toHaveTextContent("1 candidatura");
    expect(
      screen.queryByText("Ninguna candidatura coincide con los filtros"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows the skeleton, not the filtered empty state, while refreshing from an empty result with filters", () => {
    render(
      <ApplicationListComponent
        status="loading"
        applications={[]}
        errorCode={null}
        refreshing
        onRetry={() => {}}
        {...panelProps}
        query={{ status: ["enviada"], sort: "updatedAt" }}
      />,
    );

    expect(within(resultsRegion()).getByRole("status")).toBeInTheDocument();
    expect(
      screen.queryByText("Ninguna candidatura coincide con los filtros"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resultados" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(getCounter()).toBeEmptyDOMElement();
  });

  it("shows the skeleton, not the absolute empty state, while refreshing from an empty result without filters", () => {
    render(
      <ApplicationListComponent
        status="loading"
        applications={[]}
        errorCode={null}
        refreshing
        onRetry={() => {}}
        {...panelProps}
      />,
    );

    expect(within(resultsRegion()).getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("still renders the filtered empty state from a settled empty response", () => {
    render(
      <ApplicationListComponent
        status="ok"
        applications={[]}
        errorCode={null}
        refreshing={false}
        onRetry={() => {}}
        {...panelProps}
        query={{ status: ["enviada"], sort: "updatedAt" }}
      />,
    );

    expect(
      screen.getByText("Ninguna candidatura coincide con los filtros"),
    ).toBeInTheDocument();
  });
});

const renderCards = (...apps: ReturnType<typeof makeFull>[]) =>
  render(
    <ApplicationListComponent
      status="ok"
      applications={mapApplicationListFromApiToVm(apps)}
      errorCode={null}
      refreshing={false}
      onRetry={() => {}}
      {...panelProps}
    />,
  );

describe("application cards", () => {
  it("renders ul «Candidaturas» with one li > article per application", () => {
    renderCards(makeFull({ id: "a1" }), makeFull({ id: "a2" }));

    const list = screen.getByRole("list", { name: "Candidaturas" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    items.forEach((item) =>
      expect(within(item).getByRole("article")).toBeInTheDocument(),
    );
  });

  it("shows a serif h2 with an sr-only company, «company · location», badge, salary and date", () => {
    renderCards(
      makeFull({
        location: "Madrid",
        salaryMin: 52000,
        salaryMax: 52000,
        status: "enviada",
      }),
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("font-serif");
    expect(heading).toHaveTextContent("Frontend Developer, Lemoncode");
    expect(screen.getByText("Lemoncode · Madrid")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article")).getByText("Enviada"),
    ).toBeInTheDocument();
    const salary = screen.getByText(/^52\.000\s€$/);
    expect(salary).toHaveClass("font-mono", "tabular");
    expect(screen.getByText("Actualizada 12 oct. 2026")).toBeInTheDocument();
  });

  it("omits location, salary and the tag list on a bare card", () => {
    renderCards(makeFull({}));

    expect(screen.getByText("Lemoncode")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Etiquetas" }),
    ).not.toBeInTheDocument();
  });

  it("renders up to three tags without a counter", () => {
    renderCards(
      makeFull({
        tags: [tag("React", "stack"), tag("Docker", "nice_to_have")],
      }),
    );

    const tags = screen.getByRole("list", { name: "Etiquetas" });
    expect(within(tags).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/etiquetas más/)).not.toBeInTheDocument();
    expect(within(tags).getByText("Docker").parentElement).toHaveClass(
      "border-dashed",
    );
  });

  it("renders the first three tags and «+2» with an sr-only suffix for five", () => {
    renderCards(
      makeFull({
        tags: ["A1", "B2", "C3", "D4", "E5"].map((l) => tag(l, "stack")),
      }),
    );

    const tags = screen.getByRole("list", { name: "Etiquetas" });
    expect(within(tags).getAllByRole("listitem")).toHaveLength(3);
    const counter = screen.getByText(/^\+2/);
    expect(counter).toHaveTextContent("+2 etiquetas más");
    expect(within(counter).getByText("etiquetas más")).toHaveClass("sr-only");
  });

  it("renders the title through the scene link with the stretched-link classes and the sr-only company", () => {
    renderCards(makeFull({ id: "a9", location: "Madrid" }));

    const link = screen.getByRole("link", {
      name: "Frontend Developer, Lemoncode",
    });
    expect(link).toHaveAttribute("href", "/applications/a9");
    expect(link).toHaveClass("after:absolute", "after:inset-0");
    expect(screen.getByRole("heading", { level: 2 })).toContainElement(link);
    expect(within(link).getByText(", Lemoncode")).toHaveClass("sr-only");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("article")).toHaveClass(
      "has-[a:focus-visible]:ring-2",
    );
  });

  it("renders user text as text, never as markup", () => {
    renderCards(
      makeFull({
        title: "<img src=x onerror=alert(1)> Dev",
        tags: [tag("<img src=x onerror=alert(1)>", "stack")],
      }),
    );

    expect(document.querySelector("img")).toBeNull();
    expect(
      screen.getAllByText("<img src=x onerror=alert(1)>", { exact: false })
        .length,
    ).toBeGreaterThan(0);
  });
});

describe("ApplicationListScene", () => {
  it("uses the display heading size, a focusable h1 and sets the document title", async () => {
    mockFetch({ "GET /api/applications": [] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Mis candidaturas",
    });
    expect(heading).toHaveClass(
      "text-[28px]",
      "font-semibold",
      "leading-[1.2]",
    );
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.title).toBe("Mis candidaturas · Expediente");
  });
});

describe("filter panel", () => {
  it("is a search region named «Filtrar candidaturas» with a labelled «Buscar» field", () => {
    render(<ApplicationListContainer {...listProps} />);

    const panel = screen.getByRole("search", { name: "Filtrar candidaturas" });
    const field = within(panel).getByRole("searchbox", { name: "Buscar" });
    expect(field).toHaveAttribute("placeholder", "Puesto o empresa");
    expect(field).toHaveAttribute("maxlength", "100");
    expect(field).toHaveAttribute("autocomplete", "off");
  });

  it("stays rendered while the list is loading and when it fails", async () => {
    mockFetch({
      "GET /api/applications": () =>
        jsonResponse({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500),
    });
    render(<ApplicationListContainer {...listProps} />);

    expect(screen.getByRole("search")).toBeInTheDocument();
    await screen.findByRole("alert");
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("starts with the text of the query", () => {
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ q: "acme", sort: "updatedAt" }}
      />,
    );
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue(
      "acme",
    );
  });
});

describe("search debounce", () => {
  const typeInto = (value: string) =>
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
      target: { value },
    });

  it("calls onQueryChange once with the text 300 ms after the last keystroke", () => {
    vi.useFakeTimers();
    try {
      const onQueryChange = vi.fn();
      render(
        <ApplicationListContainer
          {...listProps}
          onQueryChange={onQueryChange}
        />,
      );

      typeInto("ac");
      act(() => vi.advanceTimersByTime(200));
      typeInto("acme");
      act(() => vi.advanceTimersByTime(299));
      expect(onQueryChange).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1));
      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(onQueryChange).toHaveBeenCalledWith({
        q: "acme",
        sort: "updatedAt",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("sends q undefined when the text is cleared or only blanks", () => {
    vi.useFakeTimers();
    try {
      const onQueryChange = vi.fn();
      render(
        <ApplicationListContainer
          {...listProps}
          query={{ q: "acme", sort: "appliedAt" }}
          onQueryChange={onQueryChange}
        />,
      );

      typeInto("   ");
      act(() => vi.advanceTimersByTime(300));

      expect(onQueryChange).toHaveBeenCalledTimes(1);
      expect(onQueryChange.mock.calls[0]?.[0]).toEqual({
        q: undefined,
        sort: "appliedAt",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

function StatefulList({
  initial,
  onClearFilters = () => {},
  onChange,
}: {
  initial: ListSearch;
  onClearFilters?: () => void;
  onChange?: (next: ListSearch) => void;
}) {
  const [query, setQuery] = useState(initial);
  return (
    <ApplicationListContainer
      query={query}
      onQueryChange={(next) => {
        onChange?.(next);
        setQuery(next);
      }}
      onClearFilters={() => {
        onClearFilters();
        setQuery({ sort: "updatedAt" });
      }}
      renderApplicationLink={renderApplicationLink}
      renderCreateLink={renderCreateLink}
    />
  );
}

describe("«Limpiar filtros»", () => {
  const clearButton = () =>
    screen.queryByRole("button", { name: "Limpiar filtros" });

  it("is absent with no active filter and the default sort", () => {
    render(<ApplicationListContainer {...listProps} />);
    expect(clearButton()).not.toBeInTheDocument();
  });

  it.each([
    ["q is set", { q: "acme", sort: "updatedAt" }],
    ["the sort is not the default", { sort: "appliedAt" }],
  ] as const)("is present when %s", (_, query) => {
    render(<ApplicationListContainer {...listProps} query={query} />);
    expect(clearButton()).toBeInTheDocument();
  });

  it("calls onClearFilters, empties the field and leaves it focused", async () => {
    const onClearFilters = vi.fn();
    render(
      <StatefulList
        initial={{ q: "acme", sort: "appliedAt" }}
        onClearFilters={onClearFilters}
      />,
    );
    const field = screen.getByRole("searchbox", { name: "Buscar" });
    expect(field).toHaveValue("acme");

    await userEvent.click(
      screen.getByRole("button", { name: "Limpiar filtros" }),
    );

    expect(onClearFilters).toHaveBeenCalledTimes(1);
    const remounted = screen.getByRole("searchbox", { name: "Buscar" });
    expect(remounted).toHaveValue("");
    expect(remounted).toHaveFocus();
    expect(clearButton()).not.toBeInTheDocument();
  });
});

describe("empty states", () => {
  it("shows the empty-by-filters card with an outline «Limpiar filtros» when a filter is active", async () => {
    mockFetch({ "GET /api/applications": [] });
    const onClearFilters = vi.fn();
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ q: "zzz", sort: "updatedAt" }}
        onClearFilters={onClearFilters}
      />,
    );

    const results = screen.getByRole("region", { name: "Resultados" });
    expect(
      await within(results).findByText(
        "Ninguna candidatura coincide con los filtros",
      ),
    ).toBeInTheDocument();
    expect(
      within(results).getByText(
        "Prueba con otros términos o quita algún filtro.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    const button = within(results).getByRole("button", {
      name: "Limpiar filtros",
    });
    expect(button).toHaveAttribute("data-variant", "outline");

    await userEvent.click(button);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("renders «Añadir la primera candidatura» through renderCreateLink with the outline button classes", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(<ApplicationListContainer {...listProps} />);

    const link = await screen.findByRole("link", {
      name: "Añadir la primera candidatura",
    });
    expect(link).toHaveAttribute("href", "/applications/new");
    expect(link).toHaveAttribute("data-variant", "outline");
    expect(link).toHaveClass("border", "h-11");
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it("offers no create link in the empty-by-filters card", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ q: "zzz", sort: "updatedAt" }}
      />,
    );

    await screen.findByText("Ninguna candidatura coincide con los filtros");
    expect(
      screen.queryByRole("link", { name: "Añadir la primera candidatura" }),
    ).not.toBeInTheDocument();
  });

  it("shows the plain empty state when only the sort is not the default", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(
      <ApplicationListContainer {...listProps} query={{ sort: "appliedAt" }} />,
    );

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(
      screen.queryByText("Ninguna candidatura coincide con los filtros"),
    ).not.toBeInTheDocument();
  });
});

describe("status, work mode, seniority and sort controls", () => {
  const panel = () =>
    screen.getByRole("search", { name: "Filtrar candidaturas" });

  it("offers the 7 statuses in enum order as pressed-state buttons", () => {
    render(<ApplicationListContainer {...listProps} />);

    const group = within(panel()).getByRole("toolbar", { name: "Estado" });
    const names = within(group)
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toStrictEqual([
      "Guardada",
      "Enviada",
      "En entrevistas",
      "Oferta recibida",
      "Aceptada",
      "Rechazada",
      "Descartada",
    ]);
    within(group)
      .getAllByRole("button")
      .forEach((button) =>
        expect(button).toHaveAttribute("aria-pressed", "false"),
      );
  });

  it("adds and removes statuses through onQueryChange", async () => {
    const onChange = vi.fn();
    render(<StatefulList initial={defaultQuery} onChange={onChange} />);
    const group = within(panel()).getByRole("toolbar", { name: "Estado" });

    await userEvent.click(
      within(group).getByRole("button", { name: "Enviada" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      status: ["enviada"],
      sort: "updatedAt",
    });

    await userEvent.click(
      within(group).getByRole("button", { name: "Rechazada" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      status: ["enviada", "rechazada"],
      sort: "updatedAt",
    });
    expect(
      within(group).getByRole("button", { name: "Enviada" }),
    ).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(
      within(group).getByRole("button", { name: "Enviada" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      status: ["rechazada"],
      sort: "updatedAt",
    });

    await userEvent.click(
      within(group).getByRole("button", { name: "Rechazada" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      status: undefined,
      sort: "updatedAt",
    });
  });

  it("changes work mode, seniority and sort through labelled native selects", async () => {
    const onChange = vi.fn();
    render(<StatefulList initial={defaultQuery} onChange={onChange} />);

    const workMode = screen.getByRole("combobox", { name: "Modalidad" });
    expect(
      within(workMode)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toStrictEqual(["Todas", "Remoto", "Híbrido", "Presencial"]);
    await userEvent.selectOptions(workMode, "Remoto");
    expect(onChange).toHaveBeenLastCalledWith({
      workMode: "remoto",
      seniority: undefined,
      sort: "updatedAt",
    });
    await userEvent.selectOptions(workMode, "Todas");
    expect(onChange).toHaveBeenLastCalledWith({
      workMode: undefined,
      sort: "updatedAt",
    });

    const seniority = screen.getByRole("combobox", { name: "Seniority" });
    expect(
      within(seniority)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toStrictEqual(["Todos", "Junior", "Mid", "Senior", "Lead"]);
    await userEvent.selectOptions(seniority, "Senior");
    expect(onChange).toHaveBeenLastCalledWith({
      seniority: "senior",
      workMode: undefined,
      sort: "updatedAt",
    });

    const sort = screen.getByRole("combobox", { name: "Ordenar por" });
    expect(sort).toHaveValue("updatedAt");
    await userEvent.selectOptions(sort, "Fecha de envío");
    expect(onChange).toHaveBeenLastCalledWith({
      seniority: "senior",
      workMode: undefined,
      sort: "appliedAt",
    });
  });

  it("offers «Limpiar filtros» when only the work mode is set", () => {
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ workMode: "remoto", sort: "updatedAt" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Limpiar filtros" }),
    ).toBeInTheDocument();
  });
});

describe("«Filtros y orden» disclosure", () => {
  const disclosure = (name: string) => screen.getByRole("button", { name });

  it("starts closed with no count when nothing is active, and toggles on click", async () => {
    render(<ApplicationListContainer {...listProps} />);

    const button = disclosure("Filtros y orden");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "filters-extra");
    const extra = document.getElementById("filters-extra");
    expect(extra).toHaveClass("hidden", "lg:flex");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(extra).not.toHaveClass("hidden");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("counts active dimensions plus one for a non-default sort and starts open", () => {
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ status: ["enviada", "rechazada"], sort: "appliedAt" }}
      />,
    );

    const button = disclosure("Filtros y orden (2)");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("filters-extra")).not.toHaveClass("hidden");
  });

  it("counts a status group once however many statuses are picked", () => {
    render(
      <ApplicationListContainer
        {...listProps}
        query={{
          status: ["enviada", "rechazada"],
          workMode: "remoto",
          sort: "updatedAt",
        }}
      />,
    );
    expect(disclosure("Filtros y orden (2)")).toBeInTheDocument();
  });
});

const summary = (
  label: string,
  group: "stack" | "nice_to_have" | "language",
  count: number,
) => ({ label, group, count });

describe("mapStackTagsFromApiToVm", () => {
  it("keeps only stack tags in the served order", () => {
    expect(
      mapStackTagsFromApiToVm([
        summary("React", "stack", 3),
        summary("Docker", "nice_to_have", 2),
        summary("TypeScript", "stack", 2),
      ]),
    ).toStrictEqual([{ label: "React" }, { label: "TypeScript" }]);
  });

  it("maps an empty list to an empty list", () => {
    expect(mapStackTagsFromApiToVm([])).toStrictEqual([]);
  });
});

describe("stack tag filter", () => {
  const stackArea = () =>
    screen.getByText("Stack").parentElement as HTMLElement;
  const stackList = () => screen.getByRole("list", { name: "Stack" });
  const manyTags = (n: number) =>
    Array.from({ length: n }, (_, index) =>
      summary(`Tag${index + 1}`, "stack", 20 - index),
    );

  it("shows 4 skeleton chips while GET /api/tags is pending", () => {
    mockFetch({ "GET /api/tags": () => new Promise<Response>(() => {}) });
    render(<ApplicationListContainer {...listProps} />);

    const skeletons = stackArea().querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(4);
    skeletons.forEach((node) => expect(node).toHaveClass("h-7", "w-16"));
  });

  it("shows the error with «Reintentar» after a 500, keeps the other filters working and refetches once per click", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications": [],
      "GET /api/tags": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "x" } },
              500,
            )
          : jsonResponse([summary("React", "stack", 2)]);
      },
    });
    const onChange = vi.fn();
    render(<StatefulList initial={defaultQuery} onChange={onChange} />);

    expect(
      await screen.findByText("No se pudieron cargar las etiquetas."),
    ).toBeInTheDocument();
    expect(countCalls(fetchMock, "/api/tags")).toBe(1);

    // The status filter is independent of the tags request.
    await userEvent.click(screen.getByRole("button", { name: "Enviada" }));
    expect(onChange).toHaveBeenLastCalledWith({
      status: ["enviada"],
      sort: "updatedAt",
    });

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await within(stackList()).findByRole("button", { name: "React" }),
    ).toBeInTheDocument();
    expect(countCalls(fetchMock, "/api/tags")).toBe(2);
    expect(
      screen.queryByText("No se pudieron cargar las etiquetas."),
    ).not.toBeInTheDocument();
  });

  it("keeps the error message inside an always-mounted status region", async () => {
    mockFetch({
      "GET /api/tags": () =>
        jsonResponse({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500),
    });
    render(<ApplicationListContainer {...listProps} />);

    const region = stackArea().querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
    await waitFor(() =>
      expect(region).toHaveTextContent("No se pudieron cargar las etiquetas."),
    );
  });

  it("shows the muted line when there are no stack tags", async () => {
    mockFetch({ "GET /api/tags": [summary("Docker", "nice_to_have", 2)] });
    render(<ApplicationListContainer {...listProps} />);

    expect(
      await screen.findByText("Aún no hay etiquetas de stack."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Stack" }),
    ).not.toBeInTheDocument();
  });

  it("toggles chips through onQueryChange with a pressed state and the AND helper", async () => {
    mockFetch({
      "GET /api/tags": [
        summary("React", "stack", 3),
        summary("Docker", "nice_to_have", 2),
        summary("TypeScript", "stack", 2),
      ],
    });
    const onChange = vi.fn();
    render(<StatefulList initial={defaultQuery} onChange={onChange} />);

    const list = await waitFor(() => stackList());
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toStrictEqual(["React", "TypeScript"]);

    await userEvent.click(within(list).getByRole("button", { name: "React" }));
    expect(onChange).toHaveBeenLastCalledWith({
      tags: ["React"],
      sort: "updatedAt",
    });
    expect(
      screen.queryByText("Solo candidaturas con todas las etiquetas elegidas."),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(list).getByRole("button", { name: "TypeScript" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      tags: ["React", "TypeScript"],
      sort: "updatedAt",
    });
    within(list)
      .getAllByRole("button")
      .forEach((button) =>
        expect(button).toHaveAttribute("aria-pressed", "true"),
      );
    expect(
      screen.getByText("Solo candidaturas con todas las etiquetas elegidas."),
    ).toBeInTheDocument();

    await userEvent.click(within(list).getByRole("button", { name: "React" }));
    await userEvent.click(
      within(list).getByRole("button", { name: "TypeScript" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      tags: undefined,
      sort: "updatedAt",
    });
  });

  it("shows the first 10 options, expands with «Mostrar todas» and collapses again", async () => {
    mockFetch({ "GET /api/tags": manyTags(12) });
    render(<ApplicationListContainer {...listProps} />);

    const more = await screen.findByRole("button", {
      name: "Mostrar todas (12)",
    });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(within(stackList()).getAllByRole("button")).toHaveLength(10);

    await userEvent.click(more);
    const less = screen.getByRole("button", { name: "Mostrar menos" });
    expect(less).toHaveAttribute("aria-expanded", "true");
    expect(within(stackList()).getAllByRole("button")).toHaveLength(12);

    await userEvent.click(less);
    expect(within(stackList()).getAllByRole("button")).toHaveLength(10);
  });

  it("does not offer «Mostrar todas» for exactly 10 options", async () => {
    mockFetch({ "GET /api/tags": manyTags(10) });
    render(<ApplicationListContainer {...listProps} />);

    await waitFor(() =>
      expect(within(stackList()).getAllByRole("button")).toHaveLength(10),
    );
    expect(
      screen.queryByRole("button", { name: /Mostrar/ }),
    ).not.toBeInTheDocument();
  });

  it("renders URL tags missing from the options, or beyond the first 10, as selected chips", async () => {
    mockFetch({ "GET /api/tags": manyTags(12) });
    const onChange = vi.fn();
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ tags: ["Remix", "Tag12"], sort: "updatedAt" }}
        onQueryChange={onChange}
      />,
    );

    await screen.findByRole("button", { name: "Mostrar todas (12)" });
    const list = stackList();
    expect(within(list).getByRole("button", { name: "Remix" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(list).getByRole("button", { name: "Tag12" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(within(list).getByRole("button", { name: "Remix" }));
    expect(onChange).toHaveBeenLastCalledWith({
      tags: ["Tag12"],
      sort: "updatedAt",
    });
  });

  it("keeps URL tags visible and removable while the options are still loading", () => {
    mockFetch({ "GET /api/tags": () => new Promise<Response>(() => {}) });
    render(
      <ApplicationListContainer
        {...listProps}
        query={{ tags: ["Remix"], sort: "updatedAt" }}
      />,
    );

    expect(
      within(stackList()).getByRole("button", { name: "Remix" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("useStackTags starts loading and exposes the mapped stack options", async () => {
    mockFetch({
      "GET /api/tags": [
        summary("React", "stack", 3),
        summary("Docker", "nice_to_have", 2),
      ],
    });
    const { result } = renderHook(() => useStackTags());

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.options).toStrictEqual([{ label: "React" }]);
  });
});
