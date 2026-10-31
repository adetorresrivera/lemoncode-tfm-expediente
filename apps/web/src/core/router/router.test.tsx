import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { applicationSchema } from "@tfm/contracts";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes("/api/applications"),
      ),
    ).toHaveLength(2);
  });
});

describe("search field and «Limpiar filtros» in the URL", () => {
  it("shows the URL state in the field and requests it", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications?q=123"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("searchbox", { name: "Buscar" }),
    ).toHaveValue("123");
  });

  it("shows hostile values as not applied: empty field and no clear button", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: ["/applications?status=foo&sort=title&q="],
      }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("searchbox", { name: "Buscar" }),
    ).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });

  it("updates the URL 300 ms after typing without adding history entries", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [stored] });
    const history = createMemoryHistory({ initialEntries: ["/applications"] });
    const router = createAppRouter(history);
    render(<RouterProvider router={router} />);
    const field = await screen.findByRole("searchbox", { name: "Buscar" });

    fireEvent.change(field, { target: { value: "acme" } });
    expect(router.state.location.href).toBe("/applications");
    await waitFor(() =>
      expect(router.state.location.href).toBe("/applications?q=acme"),
    );

    expect(history.length).toBe(1);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("q=acme"),
        ),
      ).toBe(true),
    );
  });

  it("«Limpiar filtros» returns to exactly /applications, replaces the entry and focuses the empty field", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const history = createMemoryHistory({
      initialEntries: ["/applications?q=acme&status=enviada&sort=appliedAt"],
    });
    const router = createAppRouter(history);
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Limpiar filtros" }),
    );

    await waitFor(() =>
      expect(router.state.location.href).toBe("/applications"),
    );
    expect(history.length).toBe(1);
    const field = screen.getByRole("searchbox", { name: "Buscar" });
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });

  it("applies no filter and the default sort at /applications", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Frontend Developer");
    expect(firstRequestUrl(fetchMock).search).toBe("?sort=updatedAt");
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });
});

describe("application detail navigation", () => {
  it("opens the detail from the card title and returns through «Mis candidaturas»", async () => {
    mockFetch({
      "GET /api/applications": [stored],
      "GET /api/applications/a1": stored,
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    const cardLink = await screen.findByRole("link", {
      name: "Frontend Developer, Lemoncode",
    });
    expect(cardLink).toHaveAttribute("href", "/applications/a1");

    await userEvent.click(cardLink);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    expect(router.state.location.pathname).toBe("/applications/a1");
    const main = within(screen.getByRole("main"));
    expect(main.getByText("Lemoncode")).toBeInTheDocument();
    expect(
      within(heading.closest("header") as HTMLElement).getByText("Guardada", {
        selector: "span",
      }),
    ).toBeInTheDocument();

    const back = main.getByRole("link", { name: "Mis candidaturas" });
    expect(back).toHaveAttribute("href", "/applications");
    await userEvent.click(back);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });

  it("deletes from the detail, lands on the list with focus on its heading and the notice, and drops the notice afterwards", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications": [],
      "GET /api/applications/a1": stored,
      "DELETE /api/applications/a1": () => new Response(null, { status: 204 }),
    });
    const history = createMemoryHistory({
      initialEntries: ["/applications/a1"],
    });
    const router = createAppRouter(history);
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Eliminar" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar candidatura" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Mis candidaturas",
    });
    expect(router.state.location.pathname).toBe("/applications");
    await waitFor(() => expect(heading).toHaveFocus());
    const notice = await screen.findByText("Candidatura eliminada.");
    expect(notice).toHaveAttribute("role", "status");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(1);
    // The one-shot state is cleared from the history entry, and the entry was replaced.
    await waitFor(() =>
      expect(router.state.location.state.notice).toBeUndefined(),
    );
    expect(history.length).toBe(1);
  });

  it("shows no notice and does not move focus on a fresh load of the list", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Mis candidaturas",
    });
    await screen.findByText("Frontend Developer");
    expect(
      screen.queryByText("Candidatura eliminada."),
    ).not.toBeInTheDocument();
    expect(heading).not.toHaveFocus();
  });

  it("requests only the encoded id when the detail is opened directly", async () => {
    const fetchMock = mockFetch({ "GET /api/applications/a1": stored });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/a1"] }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    const detailCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).startsWith("/api/applications/"),
    );
    expect(detailCalls).toHaveLength(1);
    expect(String(detailCalls[0]?.[0])).toBe("/api/applications/a1");
  });
});

const createdApplication = applicationSchema.parse({
  id: "new1",
  title: "Frontend Developer",
  company: "Acme",
  status: "guardada",
  statusHistory: [{ status: "guardada", at: "2026-10-31T10:00:00.000Z" }],
  interviews: [],
  createdAt: "2026-10-31T10:00:00.000Z",
  updatedAt: "2026-10-31T10:00:00.000Z",
  ownerId: null,
});

describe("create an application", () => {
  it("links the list header to the form", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Frontend Developer");
    const link = within(screen.getByRole("main")).getByRole("link", {
      name: "Añadir candidatura",
    });
    expect(link).toHaveAttribute("href", "/applications/new");
    expect(link).toHaveAttribute("data-variant", "default");
  });

  it("links the empty state to the form", async () => {
    mockFetch({ "GET /api/applications": [] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Añadir la primera candidatura" }),
    ).toHaveAttribute("href", "/applications/new");
  });

  it("opens the form with its heading, intro and first section", async () => {
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/new"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Añadir candidatura",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Los campos con * son obligatorios."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Puesto y empresa" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Añadir candidatura · Expediente");
  });

  it("saves from the list, replaces the form with the detail, focuses its heading and shows the notice once", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications": [],
      "POST /api/applications": () => jsonResponse(createdApplication, 201),
      "GET /api/applications/new1": createdApplication,
    });
    const history = createMemoryHistory({
      initialEntries: ["/applications"],
    });
    const router = createAppRouter(history);
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("link", { name: "Añadir candidatura" }),
    );
    await userEvent.type(
      await screen.findByLabelText("Puesto *"),
      "Frontend Developer",
    );
    await userEvent.type(screen.getByLabelText("Empresa *"), "Acme");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    expect(router.state.location.pathname).toBe("/applications/new1");
    await waitFor(() => expect(heading).toHaveFocus());
    const notice = await screen.findByText("Candidatura creada.");
    expect(notice).toHaveAttribute("role", "status");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    // The one-shot state is cleared and the form entry was replaced, so Back leaves the flow.
    await waitFor(() =>
      expect(router.state.location.state.notice).toBeUndefined(),
    );
    expect(history.length).toBe(2);
    act(() => history.back());
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/applications"),
    );
  });

  it("shows no creation notice on a fresh load of the detail", async () => {
    mockFetch({ "GET /api/applications/new1": createdApplication });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/new1"] }),
    );
    render(<RouterProvider router={router} />);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    expect(screen.queryByText("Candidatura creada.")).not.toBeInTheDocument();
    expect(heading).not.toHaveFocus();
  });

  it("discards from the form back to the list with focus on its heading and no request", async () => {
    const fetchMock = mockFetch({ "GET /api/applications": [] });
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: ["/applications", "/applications/new"],
      }),
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("link", { name: "Descartar cambios" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Mis candidaturas",
    });
    expect(router.state.location.pathname).toBe("/applications");
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(0);
  });
});

const methodCalls = (fetchMock: ReturnType<typeof mockFetch>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === method);

describe("edit an application", () => {
  it("shows «Editar» as a link to the edit route before «Eliminar» in the detail", async () => {
    mockFetch({ "GET /api/applications/a1": stored });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/a1"] }),
    );
    render(<RouterProvider router={router} />);

    const edit = await screen.findByRole("link", { name: "Editar" });
    expect(edit).toHaveAttribute("href", "/applications/a1/edit");
    const remove = screen.getByRole("button", { name: "Eliminar" });
    expect(
      edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("goes from the detail to the prefilled form, saves with PUT and returns to the detail with the notice and focus on the heading", async () => {
    const edited = { ...stored, title: "Frontend Lead" };
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored,
      "PUT /api/applications/a1": () => jsonResponse(edited),
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/a1"] }),
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(await screen.findByRole("link", { name: "Editar" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Editar candidatura",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications/a1/edit");
    const title = await screen.findByLabelText("Puesto *");
    expect(title).toHaveValue("Frontend Developer");
    expect(document.title).toBe("Editar candidatura · Expediente");

    await userEvent.clear(title);
    await userEvent.type(title, "Frontend Lead");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    expect(router.state.location.pathname).toBe("/applications/a1");
    await waitFor(() => expect(heading).toHaveFocus());
    const notice = await screen.findByText("Cambios guardados.");
    expect(notice).toHaveAttribute("role", "status");
    expect(methodCalls(fetchMock, "PUT")).toHaveLength(1);
    expect(methodCalls(fetchMock, "POST")).toHaveLength(0);
  });

  it("discards from the form back to the detail without a PUT", async () => {
    const fetchMock = mockFetch({ "GET /api/applications/a1": stored });
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: ["/applications/a1", "/applications/a1/edit"],
      }),
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("link", { name: "Descartar cambios" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    expect(router.state.location.pathname).toBe("/applications/a1");
    await waitFor(() => expect(heading).toHaveFocus());
    expect(methodCalls(fetchMock, "PUT")).toHaveLength(0);
  });

  it("returns to the list from the not-found card of a missing application", async () => {
    mockFetch({
      "GET /api/applications/zzz": () =>
        jsonResponse(
          {
            error: { code: "NOT_FOUND", message: "Candidatura no encontrada" },
          },
          404,
        ),
      "GET /api/applications": [],
    });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications/zzz/edit"] }),
    );
    render(<RouterProvider router={router} />);

    await userEvent.click(
      await screen.findByRole("link", { name: "Volver a Mis candidaturas" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });
});
