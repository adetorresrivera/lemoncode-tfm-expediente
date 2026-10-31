import { applicationSchema } from "@tfm/contracts";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HttpErrorCode } from "@/core/http/http-client";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationDetailComponent } from "./application-detail.component";
import { ApplicationDetailContainer } from "./application-detail.container";
import { useApplicationDetail } from "./application-detail.hooks";
import {
  mapApplicationFromApiToDetailVm,
  toSafeHttpUrl,
  withOptimisticStatus,
} from "./application-detail.mapper";

// The scene supplies the real router link; pod tests use a plain anchor.
const renderListLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/applications" className={link.className}>
    {link.children}
  </a>
);

const makeApplication = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Lemoncode",
    status: "guardada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ownerId: null,
    ...overrides,
  });

const notFoundResponse = () =>
  jsonResponse(
    { error: { code: "NOT_FOUND", message: "Candidatura no encontrada" } },
    404,
  );

describe("toSafeHttpUrl", () => {
  it.each([
    ["http://example.com/job", "http://example.com/job"],
    ["https://example.com/job?id=1", "https://example.com/job?id=1"],
    ["javascript:alert(1)", null],
    ["data:text/html,<b>x</b>", null],
    ["not a url", null],
    ["", null],
    [null, null],
  ])("maps %s to %s", (input, expected) => {
    expect(toSafeHttpUrl(input)).toBe(expected);
  });
});

describe("application-detail mapper", () => {
  it("maps a bare application to the exact view-model fields", () => {
    expect(mapApplicationFromApiToDetailVm(makeApplication())).toStrictEqual({
      id: "a1",
      title: "Frontend Developer",
      company: "Lemoncode",
      location: null,
      status: "guardada",
      salaryLine: null,
      appliedAtLabel: null,
      sourceUrl: null,
      createdAtLabel: "12 oct. 2026",
      updatedAtLabel: "12 oct. 2026",
      tagGroups: [],
      notes: null,
      offerText: null,
      history: [{ status: "guardada", atLabel: "12 oct. 2026" }],
    });
  });

  it("orders the history newest first", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        status: "enviada",
        statusHistory: [
          { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
          { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
        ],
      }),
    );
    expect(vm.history).toStrictEqual([
      { status: "enviada", atLabel: "14 oct. 2026" },
      { status: "guardada", atLabel: "12 oct. 2026" },
    ]);
  });

  it("builds the tag groups in order and drops the empty ones", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        workMode: "hibrido",
        seniority: "senior",
        contractType: "indefinido",
        tags: [
          { label: "Inglés", group: "language" },
          { label: "Docker", group: "nice_to_have" },
          { label: "React", group: "stack" },
        ],
      }),
    );
    expect(vm.tagGroups).toStrictEqual([
      { title: "Stack tecnológico", tags: [{ label: "React", soft: false }] },
      { title: "Se valora", tags: [{ label: "Docker", soft: true }] },
      {
        title: "Modelo de trabajo",
        tags: [{ label: "Híbrido", soft: false }],
      },
      { title: "Seniority", tags: [{ label: "Senior", soft: false }] },
      { title: "Contrato", tags: [{ label: "Indefinido", soft: false }] },
      { title: "Idiomas", tags: [{ label: "Inglés", soft: false }] },
    ]);
  });

  it("builds the salary line with «brutos al año» and drops unsafe links", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        salaryMin: 52000,
        salaryMax: 65000,
        appliedAt: "2026-10-13T08:00:00.000Z",
        sourceUrl: "https://example.com/job",
      }),
    );
    expect(vm.salaryLine).toBe("52.000 € – 65.000 € brutos al año");
    expect(vm.appliedAtLabel).toBe("13 oct. 2026");
    expect(vm.sourceUrl).toBe("https://example.com/job");
  });
});

describe("useApplicationDetail", () => {
  it("loads and maps the application", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    const { result } = renderHook(() =>
      useApplicationDetail("a1", { onDeleted: () => {} }),
    );

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.vm?.title).toBe("Frontend Developer");
  });

  it("yields notFound for a 404 answer", async () => {
    mockFetch({ "GET /api/applications/zzz": notFoundResponse });
    const { result } = renderHook(() =>
      useApplicationDetail("zzz", { onDeleted: () => {} }),
    );

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(result.current.vm).toBeNull();
  });

  it("yields error for a network failure and refetches once on retry", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications/a1": () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new TypeError("offline"))
          : jsonResponse(makeApplication());
      },
    });
    const { result } = renderHook(() =>
      useApplicationDetail("a1", { onDeleted: () => {} }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorCode).toBe("NETWORK_ERROR");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("encodes the id before it reaches the API path", async () => {
    const fetchMock = mockFetch({});
    const { result } = renderHook(() =>
      useApplicationDetail("a/b?c", { onDeleted: () => {} }),
    );

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/applications/a%2Fb%3Fc",
    );
  });
});

describe("ApplicationDetailContainer header", () => {
  it("shows the back link, eyebrow, h1, company with location and the status badge", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        location: "Madrid",
        status: "enviada",
        statusHistory: [
          { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
          { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
        ],
      }),
    });
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        onDeleted={() => {}}
        renderListLink={renderListLink}
      />,
    );

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Frontend Developer");
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveClass("min-w-0", "break-words", "font-serif");
    expect(screen.getByText("Expediente")).toBeInTheDocument();
    expect(screen.getByText(/Lemoncode/)).toHaveTextContent(
      "Lemoncode · Madrid",
    );
    expect(
      within(heading.closest("header") as HTMLElement).getByText("Enviada", {
        selector: "span",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
    expect(document.title).toBe("Frontend Developer · Expediente");
  });

  it("shows the not-found link to the list for a 404", async () => {
    mockFetch({ "GET /api/applications/zzz": notFoundResponse });
    render(
      <ApplicationDetailContainer
        applicationId="zzz"
        onDeleted={() => {}}
        renderListLink={renderListLink}
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
  });

  it("offers «Reintentar» after a failure and refetches", async () => {
    let calls = 0;
    mockFetch({
      "GET /api/applications/a1": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "x" } },
              500,
            )
          : jsonResponse(makeApplication());
      },
    });
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        onDeleted={() => {}}
        renderListLink={renderListLink}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Reintentar" }),
    );
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Frontend Developer",
    );
  });
});

const renderOk = (overrides: Record<string, unknown> = {}) =>
  render(
    <ApplicationDetailComponent
      status="ok"
      vm={mapApplicationFromApiToDetailVm({
        ...makeApplication(),
        ...overrides,
      })}
      errorCode={null}
      onRetry={() => {}}
      onChangeStatus={() => {}}
      statusPending={false}
      statusFeedback={null}
      deleteState="idle"
      onDelete={() => {}}
      renderListLink={renderListLink}
    />,
  );

const FULL = {
  location: "Madrid",
  salaryMin: 52000,
  salaryMax: 65000,
  appliedAt: "2026-10-13T08:00:00.000Z",
  sourceUrl: "https://example.com/job",
  notes: "Notas de ejemplo",
  offerText: "Texto de la oferta",
  workMode: "remoto",
  seniority: "mid",
  contractType: "indefinido",
  tags: [
    { label: "React", group: "stack" },
    { label: "Docker", group: "nice_to_have" },
    { label: "Inglés", group: "language" },
  ],
};

describe("detail sections", () => {
  it("renders every offer row and the safe external link for a complete application", () => {
    renderOk(FULL);

    const labels = [
      "Ubicación",
      "Salario",
      "Fecha de envío",
      "Enlace",
      "Creada",
      "Actualizada",
    ];
    labels.forEach((label) => expect(screen.getByText(label)).toBeVisible());
    expect(screen.getByText("Madrid")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "DD" &&
          element.textContent?.replace(/\s/g, " ") ===
            "52.000 € – 65.000 € brutos al año",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("13 oct. 2026")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Ver oferta original/ });
    expect(link).toHaveAttribute("href", "https://example.com/job");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("(se abre en una pestaña nueva)");
  });

  it("shows only Creada and Actualizada plus the muted fallbacks for a bare application", () => {
    renderOk();

    expect(screen.getByText("Creada")).toBeInTheDocument();
    expect(screen.getByText("Actualizada")).toBeInTheDocument();
    ["Ubicación", "Salario", "Fecha de envío", "Enlace"].forEach((label) =>
      expect(screen.queryByText(label)).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText("Esta candidatura aún no tiene más datos de la oferta."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin etiquetas.")).toBeInTheDocument();
    expect(screen.getByText("Sin notas.")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Texto original de la oferta" }),
    ).not.toBeInTheDocument();
  });

  it("renders no link for a legacy javascript: URL", () => {
    renderOk({ sourceUrl: "javascript:alert(1)" });

    expect(
      screen.queryByRole("link", { name: /Ver oferta original/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Enlace")).not.toBeInTheDocument();
    expect(
      screen.getByText("Esta candidatura aún no tiene más datos de la oferta."),
    ).toBeInTheDocument();
  });

  it("groups the tags and renders soft chips dashed, with empty groups omitted", () => {
    renderOk(FULL);

    const tags = screen.getByRole("region", { name: "Etiquetas" });
    [
      "Stack tecnológico",
      "Se valora",
      "Modelo de trabajo",
      "Seniority",
      "Contrato",
      "Idiomas",
    ].forEach((title) => expect(within(tags).getByText(title)).toBeVisible());
    expect(within(tags).getByText("Remoto")).toBeInTheDocument();
    expect(within(tags).getByText("Mid")).toBeInTheDocument();
    expect(within(tags).getByText("Indefinido")).toBeInTheDocument();
    expect(within(tags).getByText("Docker").parentElement).toHaveClass(
      "border-dashed",
    );
    expect(within(tags).getByText("React").parentElement).not.toHaveClass(
      "border-dashed",
    );
    expect(within(tags).queryByText("Sin etiquetas.")).not.toBeInTheDocument();
  });

  it("omits the groups that have no tags", () => {
    renderOk({ tags: [{ label: "React", group: "stack" }] });

    const tags = screen.getByRole("region", { name: "Etiquetas" });
    expect(within(tags).getByText("Stack tecnológico")).toBeInTheDocument();
    expect(within(tags).queryByText("Se valora")).not.toBeInTheDocument();
    expect(within(tags).queryByText("Idiomas")).not.toBeInTheDocument();
  });

  it("keeps line breaks and renders notes as text, never as markup", () => {
    renderOk({ notes: "línea 1\nlínea 2 <img src=x onerror=alert(1)>" });

    const notes = screen.getByRole("region", { name: "Notas" });
    const paragraph = within(notes).getByText(/línea 1/);
    expect(paragraph).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(paragraph.textContent).toBe(
      "línea 1\nlínea 2 <img src=x onerror=alert(1)>",
    );
    expect(document.querySelector("img")).toBeNull();
  });

  it("keeps the offer text unmounted until «Mostrar texto original» is opened", async () => {
    renderOk({ offerText: "Buscamos <img src=x onerror=alert(1)> perfil" });

    const trigger = screen.getByRole("button", {
      name: "Mostrar texto original",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Buscamos/)).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(
      screen.getByRole("button", { name: "Ocultar texto original" }),
    ).toHaveAttribute("aria-expanded", "true");
    const text = screen.getByText(/Buscamos/);
    expect(text).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(text.textContent).toBe(
      "Buscamos <img src=x onerror=alert(1)> perfil",
    );
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows the history newest first with «Actual» on the first entry only", () => {
    renderOk({
      status: "enviada",
      statusHistory: [
        { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
        { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
      ],
    });

    const history = screen.getByRole("region", {
      name: "Historial de estados",
    });
    const items = within(history).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Enviada");
    expect(items[0]).toHaveTextContent("14 oct. 2026");
    expect(items[0]).toHaveTextContent("Actual");
    expect(items[1]).toHaveTextContent("Guardada");
    expect(items[1]).toHaveTextContent("12 oct. 2026");
    expect(items[1]).not.toHaveTextContent("Actual");
  });

  it("marks a single history entry as «Actual»", () => {
    renderOk();

    const items = within(
      screen.getByRole("region", { name: "Historial de estados" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Actual");
  });

  it("grows with 15 history entries and adds no inner scroll box", () => {
    const entries = Array.from({ length: 15 }, (_, index) => ({
      status: "guardada",
      at: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    renderOk({ statusHistory: entries });

    const list = within(
      screen.getByRole("region", { name: "Historial de estados" }),
    ).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(15);
    expect(list.className).not.toMatch(/overflow|max-h/);
  });

  it("never renders interview rounds or linked documents", () => {
    renderOk(FULL);

    expect(
      screen.queryByRole("heading", { name: /ronda|entrevista/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /documento|CV|carta/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ronda/i })).toBeNull();
  });

  it("wraps a long title and company instead of overflowing", () => {
    renderOk({ title: "T".repeat(120), company: "C".repeat(120) });

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "min-w-0",
      "break-words",
    );
    expect(screen.getByText("C".repeat(120))).toHaveClass(
      "min-w-0",
      "break-words",
    );
  });
});

const renderState = (
  status: "loading" | "notFound" | "error",
  errorCode: HttpErrorCode | null = null,
) =>
  render(
    <ApplicationDetailComponent
      status={status}
      vm={null}
      errorCode={errorCode}
      onRetry={() => {}}
      onChangeStatus={() => {}}
      statusPending={false}
      statusFeedback={null}
      deleteState="idle"
      onDelete={() => {}}
      renderListLink={renderListLink}
    />,
  );

describe("detail page states", () => {
  it("shows skeletons inside a busy status with sr-only text while loading", () => {
    renderState("loading");

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Cargando candidatura…");
    expect(
      status.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("shows the not-found alert with the link back to the list", () => {
    renderState("notFound");

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No encontramos esta candidatura",
      }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent("Puede que la hayas eliminado.");
    expect(
      within(alert).getByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
  });

  it.each([
    [
      "NETWORK_ERROR" as const,
      "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
    ],
    [
      "INVALID_RESPONSE" as const,
      "El servidor respondió algo inesperado. Inténtalo de nuevo.",
    ],
    ["INTERNAL_ERROR" as const, "Algo ha fallado. Inténtalo de nuevo."],
  ])("shows fixed copy for %s with a retry button", async (code, body) => {
    const onRetry = vi.fn();
    render(
      <ApplicationDetailComponent
        status="error"
        vm={null}
        errorCode={code}
        onRetry={onRetry}
        onChangeStatus={() => {}}
        statusPending={false}
        statusFeedback={null}
        deleteState="idle"
        onDelete={() => {}}
        renderListLink={renderListLink}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudo cargar la candidatura",
      }),
    ).toBeInTheDocument();
    expect(alert).toHaveTextContent(body);
    await userEvent.click(
      within(alert).getByRole("button", { name: "Reintentar" }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("withOptimisticStatus", () => {
  it("returns a new view model with the new status and a newest-first entry, without mutating the input", () => {
    const vm = mapApplicationFromApiToDetailVm(makeApplication());
    const before = structuredClone(vm);

    const next = withOptimisticStatus(vm, "enviada", "30 oct. 2026");

    expect(next).not.toBe(vm);
    expect(next.status).toBe("enviada");
    expect(next.history).toStrictEqual([
      { status: "enviada", atLabel: "30 oct. 2026" },
      { status: "guardada", atLabel: "12 oct. 2026" },
    ]);
    expect(vm).toStrictEqual(before);
  });
});

const sentApplication = () =>
  makeApplication({
    status: "enviada",
    appliedAt: "2026-10-30T09:00:00.000Z",
    statusHistory: [
      { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
      { status: "enviada", at: "2026-10-30T09:00:00.000Z" },
    ],
  });

const renderDetail = (onDeleted: () => void = () => {}) =>
  render(
    <ApplicationDetailContainer
      applicationId="a1"
      onDeleted={onDeleted}
      renderListLink={renderListLink}
    />,
  );

const statusSelect = () =>
  screen.findByRole("combobox", { name: "Cambiar estado" });

const deferred = () => {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const serverError = () =>
  jsonResponse({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500);

describe("status change", () => {
  it("offers the 7 statuses in enum order with the current one selected", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();

    const select = await statusSelect();
    expect(select).toHaveValue("guardada");
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toStrictEqual([
      "Guardada",
      "Enviada",
      "En entrevistas",
      "Oferta recibida",
      "Aceptada",
      "Rechazada",
      "Descartada",
    ]);
  });

  it("updates badge, select and history before the response, then announces the success", async () => {
    const patch = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "PATCH /api/applications/a1/status": () => patch.promise,
    });
    renderDetail();
    const select = await statusSelect();
    const header = (await screen.findByRole("heading", { level: 1 })).closest(
      "header",
    ) as HTMLElement;

    await userEvent.selectOptions(select, "enviada");

    expect(select).toHaveValue("enviada");
    expect(
      within(header).getByText("Enviada", { selector: "span" }),
    ).toBeInTheDocument();
    const history = screen.getByRole("region", {
      name: "Historial de estados",
    });
    const entries = within(history).getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("Actual");
    expect(entries[0]).toHaveTextContent("Enviada");
    expect(select).toHaveAttribute("aria-busy", "true");
    expect(select).toHaveAttribute("aria-disabled", "true");
    expect(select).not.toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Guardando…");

    patch.resolve(jsonResponse(sentApplication()));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Estado cambiado a Enviada.",
      ),
    );
    expect(select).toHaveAttribute("aria-busy", "false");
    expect(select).toHaveAttribute("aria-disabled", "false");
    expect(select).toHaveValue("enviada");
    expect(within(history).getAllByRole("listitem")[0]).toHaveTextContent(
      "30 oct. 2026",
    );
    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(1);
    expect(String(patchCalls[0]?.[0])).toBe("/api/applications/a1/status");
    expect(patchCalls[0]?.[1]?.body).toBe(
      JSON.stringify({ status: "enviada" }),
    );
  });

  it("restores badge, select and history and announces the error when the PATCH fails", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "PATCH /api/applications/a1/status": serverError,
    });
    renderDetail();
    const select = await statusSelect();
    const header = (await screen.findByRole("heading", { level: 1 })).closest(
      "header",
    ) as HTMLElement;

    await userEvent.selectOptions(select, "enviada");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "No se pudo cambiar el estado. Inténtalo de nuevo.",
      ),
    );
    expect(select).toHaveValue("guardada");
    expect(
      within(header).getByText("Guardada", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Historial de estados" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
    expect(select).toHaveAttribute("aria-busy", "false");
    expect(select).toHaveFocus();
  });

  it("sends one PATCH when two statuses are selected while the first is pending", async () => {
    const patch = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "PATCH /api/applications/a1/status": () => patch.promise,
    });
    renderDetail();
    const select = await statusSelect();

    await userEvent.selectOptions(select, "enviada");
    await userEvent.selectOptions(select, "rechazada");

    patch.resolve(jsonResponse(sentApplication()));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Estado cambiado a Enviada.",
      ),
    );
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(1);
    expect(select).toHaveValue("enviada");
  });

  it("sends no PATCH when the current status is selected", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
    });
    renderDetail();
    const select = await statusSelect();

    await userEvent.selectOptions(select, "guardada");

    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("clears the success message after 5 seconds", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "PATCH /api/applications/a1/status": () =>
        jsonResponse(sentApplication()),
    });
    renderDetail();
    const select = await statusSelect();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent
        .setup({ advanceTimers: vi.advanceTimersByTime })
        .selectOptions(select, "enviada");
      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(
          "Estado cambiado a Enviada.",
        ),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});

const deleteCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");

const noContent = () => new Response(null, { status: 204 });

const openDeleteDialog = async () => {
  const trigger = await screen.findByRole("button", { name: "Eliminar" });
  await userEvent.click(trigger);
  return {
    trigger,
    dialog: await screen.findByRole("alertdialog"),
  };
};

describe("delete dialog", () => {
  it("opens with the title, the description with title and company, and focus on «Conservar candidatura»", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();

    const { dialog } = await openDeleteDialog();

    expect(
      within(dialog).getByText("¿Eliminar esta candidatura?"),
    ).toBeInTheDocument();
    const description = within(dialog).getByText(/Vas a eliminar/);
    expect(description).toHaveTextContent(
      "Vas a eliminar «Frontend Developer» de Lemoncode. Esta acción no se puede deshacer.",
    );
    expect(description).toHaveClass("break-words");
    expect(
      within(dialog).getByRole("button", { name: "Conservar candidatura" }),
    ).toHaveFocus();
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]", "overflow-y-auto");
  });

  it("closes with Escape and returns focus to «Eliminar»", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { trigger } = await openDeleteDialog();

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("closes with «Conservar candidatura» and returns focus to «Eliminar»", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
    });
    renderDetail();
    const { trigger, dialog } = await openDeleteDialog();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Conservar candidatura" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
    expect(deleteCalls(fetchMock)).toHaveLength(0);
  });

  it("closes when the overlay is clicked", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { trigger } = await openDeleteDialog();
    const overlay = document.querySelector(
      '[data-slot="alert-dialog-overlay"]',
    );
    expect(overlay).not.toBeNull();

    await userEvent.click(overlay as Element);

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("sends one DELETE on confirm and reports the deletion", async () => {
    const onDeleted = vi.fn();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "DELETE /api/applications/a1": noContent,
    });
    renderDetail(onDeleted);
    const { dialog } = await openDeleteDialog();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar candidatura" }),
    );

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteCalls(fetchMock)).toHaveLength(1);
    expect(String(deleteCalls(fetchMock)[0]?.[0])).toBe("/api/applications/a1");
  });

  it("shows «Eliminando…», ignores Escape and a second click while the DELETE is pending", async () => {
    const pending = deferred();
    const onDeleted = vi.fn();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "DELETE /api/applications/a1": () => pending.promise,
    });
    renderDetail(onDeleted);
    const { dialog } = await openDeleteDialog();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar candidatura" }),
    );

    const confirm = await within(dialog).findByRole("button", {
      name: "Eliminando…",
    });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(
      within(dialog).getByRole("button", { name: "Conservar candidatura" }),
    ).toHaveAttribute("aria-disabled", "true");

    await userEvent.keyboard("{Escape}");
    await userEvent.click(confirm);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Conservar candidatura" }),
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(deleteCalls(fetchMock)).toHaveLength(1);

    pending.resolve(noContent());
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open with the polite error and focus on the confirm button when the DELETE fails", async () => {
    const onDeleted = vi.fn();
    mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "DELETE /api/applications/a1": serverError,
    });
    renderDetail(onDeleted);
    const { dialog } = await openDeleteDialog();
    const confirm = within(dialog).getByRole("button", {
      name: "Eliminar candidatura",
    });
    confirm.focus();

    await userEvent.click(confirm);

    expect(
      await within(dialog).findByText(
        "No se pudo eliminar la candidatura. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "No se pudo eliminar la candidatura. Inténtalo de nuevo.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Eliminar candidatura" }),
    ).toHaveFocus();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
