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
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListSearch } from "@/core/router/application-search";
import { createAppRouter } from "@/core/router/router";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationListComponent } from "./application-list.component";
import { ApplicationListContainer } from "./application-list.container";
import { useApplicationList } from "./application-list.hooks";
import {
  mapApplicationFromApiToVm,
  mapApplicationListFromApiToVm,
} from "./application-list.mapper";

const defaultQuery: ListSearch = { sort: "updatedAt" };
const listProps = {
  query: defaultQuery,
  onQueryChange: () => {},
  onClearFilters: () => {},
};

const panelProps = {
  query: defaultQuery,
  onQueryChange: () => {},
  onClear: () => {},
  clearCount: 0,
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

    expect(screen.getByRole("status")).toHaveTextContent(
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
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(retry);

    expect(await screen.findByRole("listitem")).toHaveTextContent(
      "Frontend Developer",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
  document.querySelector<HTMLElement>('[aria-live="polite"]');

describe("ApplicationListContainer loading state", () => {
  it("shows a status region with three hidden skeleton cards and an empty counter during the first load", () => {
    mockFetch({
      "GET /api/applications": () => new Promise<Response>(() => {}),
    });
    render(<ApplicationListContainer {...listProps} />);

    const status = screen.getByRole("status");
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getCounter()).toHaveTextContent("1 candidatura");
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
    expect(screen.getByText("Enviada")).toBeInTheDocument();
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
  onClearFilters,
}: {
  initial: ListSearch;
  onClearFilters: () => void;
}) {
  const [query, setQuery] = useState(initial);
  return (
    <ApplicationListContainer
      query={query}
      onQueryChange={setQuery}
      onClearFilters={() => {
        onClearFilters();
        setQuery({ sort: "updatedAt" });
      }}
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
