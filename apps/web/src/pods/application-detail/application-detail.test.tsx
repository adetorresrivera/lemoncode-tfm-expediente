import { applicationSchema, documentSchema } from "@tfm/contracts";
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
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HttpErrorCode } from "@/core/http/http-client";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationDetailComponent } from "./application-detail.component";
import { ApplicationDetailContainer } from "./application-detail.container";
import { useApplicationDetail } from "./application-detail.hooks";
import {
  mapApplicationFromApiToDetailVm,
  mapDocumentFromApiToDetailVm,
  toSafeHttpUrl,
  withOptimisticStatus,
} from "./application-detail.mapper";
import type { DetailDocumentsVm } from "./application-detail.vm";

// The scene supplies the real router link; pod tests use a plain anchor.
const renderListLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/applications" className={link.className}>
    {link.children}
  </a>
);

const renderEditLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/edit-stub" className={link.className}>
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

const makeDocument = (overrides: Record<string, unknown> = {}) =>
  documentSchema.parse({
    id: "d1",
    type: "cv",
    name: "CV Frontend",
    version: "v3",
    fileName: "CV Frontend.pdf",
    s3Key: "documents/d1.pdf",
    mimeType: "application/pdf",
    size: 235520,
    createdAt: "2026-10-12T10:00:00.000Z",
    ...overrides,
  });

const noDocuments: DetailDocumentsVm = {
  cv: { kind: "none" },
  coverLetter: { kind: "none" },
};

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
      interviews: [],
      newInterviewValues: {
        type: "",
        round: "1",
        scheduledAt: "",
        mode: "online",
        outcome: "pendiente",
        notes: "",
      },
      documentLinks: { cv: null, coverLetter: null },
    });
  });

  it("maps the linked document ids to documentLinks", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({ cvDocumentId: "d1", coverLetterDocumentId: "d2" }),
    );
    expect(vm.documentLinks).toStrictEqual({ cv: "d1", coverLetter: "d2" });
  });

  it("maps a document to its label, size and download link", () => {
    expect(
      mapDocumentFromApiToDetailVm(makeDocument({ id: "d 1" })),
    ).toStrictEqual({
      id: "d 1",
      label: "CV Frontend · v3 · 12 oct. 2026",
      sizeLabel: "230 KB",
      downloadHref: "/api/documents/d%201/download",
      downloadLabel: "Descargar CV Frontend",
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
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
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

  it("renders «Editar» inside the link from the scene, with the primary button classes, before «Eliminar»", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        onDeleted={() => {}}
        renderListLink={renderListLink}
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
      />,
    );

    const edit = await screen.findByRole("link", { name: "Editar" });
    expect(edit).toHaveAttribute("href", "/edit-stub");
    expect(edit).toHaveClass("bg-primary", "h-11");
    const remove = screen.getByRole("button", { name: "Eliminar" });
    expect(
      edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the not-found link to the list for a 404", async () => {
    mockFetch({ "GET /api/applications/zzz": notFoundResponse });
    render(
      <ApplicationDetailContainer
        applicationId="zzz"
        onDeleted={() => {}}
        renderListLink={renderListLink}
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
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
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
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

// The section is idle: no request in flight and nothing to announce.
const idleInterviewActions = {
  busy: false,
  feedback: null,
  add: async () => {},
  update: async () => {},
  remove: async () => {},
};

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
      interviewActions={idleInterviewActions}
      documents={noDocuments}
      renderListLink={renderListLink}
      renderEditLink={renderEditLink}
      notice=""
      focusHeadingRef={() => {}}
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

  it("renders the Documentos section under the history with its two fixed rows", () => {
    renderOk(FULL);

    const section = screen.getByRole("region", { name: "Documentos" });
    const history = screen.getByRole("region", {
      name: "Historial de estados",
    });
    expect(
      history.compareDocumentPosition(section) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const rows = within(section).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("CV");
    expect(rows[0]).toHaveTextContent("Sin CV vinculado.");
    expect(rows[1]).toHaveTextContent("Carta de presentación");
    expect(rows[1]).toHaveTextContent("Sin carta vinculada.");
    expect(within(section).queryByRole("link")).not.toBeInTheDocument();
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
      interviewActions={idleInterviewActions}
      documents={noDocuments}
      renderListLink={renderListLink}
      renderEditLink={renderEditLink}
      notice=""
      focusHeadingRef={() => {}}
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
        interviewActions={idleInterviewActions}
        documents={noDocuments}
        renderListLink={renderListLink}
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
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
      renderEditLink={renderEditLink}
      notice=""
      focusHeadingRef={() => {}}
    />,
  );

// The loaded view has four polite regions: the status-change feedback (inside the header), the
// arrival notice line that follows the header, the rounds section's feedback line and the
// documents section's «Cargando documentos…» region.
const feedbackLine = (): HTMLElement => {
  const [first] = screen.getAllByRole("status");
  if (first === undefined) throw new Error("No status region rendered");
  return first;
};

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
    expect(feedbackLine()).toHaveTextContent("Guardando…");

    patch.resolve(jsonResponse(sentApplication()));

    await waitFor(() =>
      expect(feedbackLine()).toHaveTextContent("Estado cambiado a Enviada."),
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
      expect(feedbackLine()).toHaveTextContent(
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
      expect(feedbackLine()).toHaveTextContent("Estado cambiado a Enviada."),
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
    expect(feedbackLine()).toBeEmptyDOMElement();
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
        expect(feedbackLine()).toHaveTextContent("Estado cambiado a Enviada."),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(feedbackLine()).toBeEmptyDOMElement();
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
      "Vas a eliminar «Frontend Developer» de Lemoncode. Esta acción no se puede deshacer. Los documentos vinculados no se eliminan.",
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

  it("reopens clean after a failed DELETE: no previous error and focus on «Conservar candidatura»", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "DELETE /api/applications/a1": serverError,
    });
    renderDetail();
    const { trigger, dialog } = await openDeleteDialog();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar candidatura" }),
    );
    await within(dialog).findByText(
      "No se pudo eliminar la candidatura. Inténtalo de nuevo.",
    );

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Conservar candidatura" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await userEvent.click(trigger);

    const reopened = await screen.findByRole("alertdialog");
    expect(
      within(reopened).queryByText(
        "No se pudo eliminar la candidatura. Inténtalo de nuevo.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(reopened).getByRole("button", { name: "Conservar candidatura" }),
    ).toHaveFocus();
  });
});

describe("arrival notice", () => {
  it("renders the notice in a polite status line and hands the h1 to the heading ref", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    const attached: (HTMLElement | null)[] = [];
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        onDeleted={() => {}}
        renderListLink={renderListLink}
        renderEditLink={renderEditLink}
        notice="Candidatura creada."
        focusHeadingRef={(node) => {
          attached.push(node);
        }}
      />,
    );

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(attached).toContain(heading);
    const notice = screen.getByText("Candidatura creada.");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveAttribute("aria-live", "polite");
  });

  it("keeps an empty status line when there is no notice", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();

    await screen.findByRole("heading", { level: 1 });
    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(4);
    expect(regions[1]).toBeEmptyDOMElement();
    expect(regions[2]).toBeEmptyDOMElement();
    expect(regions[3]).toBeEmptyDOMElement();
  });
});

const postCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const round = (overrides: Record<string, unknown> = {}) => ({
  id: "i1",
  round: 1,
  type: "tecnica",
  scheduledAt: null,
  mode: "online",
  notes: null,
  outcome: "pendiente",
  ...overrides,
});

const interviewedApplication = () =>
  makeApplication({
    status: "en_entrevistas",
    appliedAt: "2026-10-30T09:00:00.000Z",
    updatedAt: "2026-10-31T09:00:00.000Z",
    statusHistory: [
      { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
      { status: "enviada", at: "2026-10-30T09:00:00.000Z" },
      { status: "en_entrevistas", at: "2026-10-31T09:00:00.000Z" },
    ],
    interviews: [round()],
  });

const openAddDialog = async () => {
  const opener = await screen.findByRole("button", { name: "Añadir ronda" });
  await userEvent.click(opener);
  return { opener, dialog: await screen.findByRole("dialog") };
};

const roundsRegion = () =>
  screen.getByRole("region", { name: "Rondas de entrevista" });

describe("interview rounds", () => {
  it("adds a round through the dialog and replaces rounds, badge, history and feedback with the response", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": sentApplication(),
      "POST /api/applications/a1/interviews": () =>
        jsonResponse(interviewedApplication(), 201),
    });
    renderDetail();
    const header = (await screen.findByRole("heading", { level: 1 })).closest(
      "header",
    ) as HTMLElement;
    expect(
      within(roundsRegion()).getByText(
        "Aún no hay rondas. Añade la primera cuando te convoquen.",
      ),
    ).toBeInTheDocument();

    const { opener, dialog } = await openAddDialog();

    expect(
      within(dialog).getByRole("heading", { name: "Añadir ronda" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Anota los datos de la entrevista. Solo el tipo es obligatorio.",
      ),
    ).toBeInTheDocument();
    const type = within(dialog).getByRole("combobox", { name: /Tipo/ });
    expect(type).toHaveValue("");
    expect(type).toHaveFocus();
    expect(
      within(dialog).getByRole("spinbutton", { name: "Ronda" }),
    ).toHaveValue(1);

    await userEvent.selectOptions(type, "tecnica");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(1);
    expect(String(posts[0]?.[0])).toBe("/api/applications/a1/interviews");
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toStrictEqual({
      type: "tecnica",
      round: 1,
      scheduledAt: null,
      mode: "online",
      outcome: "pendiente",
      notes: null,
    });
    expect(
      within(roundsRegion()).getByRole("heading", {
        level: 3,
        name: "Ronda 1 · Técnica",
      }),
    ).toBeInTheDocument();
    expect(
      within(header).getByText("En entrevistas", { selector: "span" }),
    ).toBeInTheDocument();
    const entries = within(
      screen.getByRole("region", { name: "Historial de estados" }),
    ).getAllByRole("listitem");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent("En entrevistas");
    expect(within(roundsRegion()).getByRole("status")).toHaveTextContent(
      "Ronda añadida. Estado cambiado a En entrevistas.",
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });

  describe("validation", () => {
    it("asks for a type, moves focus to «Tipo» and sends nothing", async () => {
      const fetchMock = mockFetch({
        "GET /api/applications/a1": sentApplication(),
      });
      renderDetail();
      const { dialog } = await openAddDialog();
      const type = within(dialog).getByRole("combobox", { name: /Tipo/ });
      expect(type).toHaveFocus();

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      expect(
        await within(dialog).findByText("Elige un tipo de ronda."),
      ).toBeInTheDocument();
      expect(type).toHaveAttribute("aria-invalid", "true");
      await waitFor(() => expect(type).toHaveFocus());
      expect(postCalls(fetchMock)).toHaveLength(0);
    });

    it("rejects a round of 0 with the fixed message and sends nothing", async () => {
      const fetchMock = mockFetch({
        "GET /api/applications/a1": sentApplication(),
      });
      renderDetail();
      const { dialog } = await openAddDialog();
      await userEvent.selectOptions(
        within(dialog).getByRole("combobox", { name: /Tipo/ }),
        "tecnica",
      );
      const roundField = within(dialog).getByRole("spinbutton", {
        name: "Ronda",
      });
      await userEvent.clear(roundField);
      await userEvent.type(roundField, "0");

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      expect(
        await within(dialog).findByText(
          "La ronda debe ser un número entero de 1 o más.",
        ),
      ).toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(0);
    });
  });

  describe("round number", () => {
    it("prefills the next round and leaves the key out of the body when the field is emptied", async () => {
      const stored = makeApplication({
        interviews: [
          round({ id: "i1", round: 1 }),
          round({ id: "i3", round: 3, type: "manager" }),
        ],
      });
      const fetchMock = mockFetch({
        "GET /api/applications/a1": stored,
        "POST /api/applications/a1/interviews": () => jsonResponse(stored, 201),
      });
      renderDetail();
      const { dialog } = await openAddDialog();
      const roundField = within(dialog).getByRole("spinbutton", {
        name: "Ronda",
      });
      expect(roundField).toHaveValue(4);

      await userEvent.selectOptions(
        within(dialog).getByRole("combobox", { name: /Tipo/ }),
        "cultural",
      );
      await userEvent.clear(roundField);
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      const body = JSON.parse(String(postCalls(fetchMock)[0]?.[1]?.body));
      expect(body).not.toHaveProperty("round");
      expect(body.type).toBe("cultural");
    });

    it("caps the prefill at Number.MAX_SAFE_INTEGER", () => {
      const vm = mapApplicationFromApiToDetailVm(
        makeApplication({
          interviews: [round({ round: Number.MAX_SAFE_INTEGER })],
        }),
      );

      expect(vm.newInterviewValues.round).toBe(String(Number.MAX_SAFE_INTEGER));
    });
  });

  describe("while saving", () => {
    it("shows «Guardando…», sends one POST and ignores every way to close the dialog", async () => {
      const post = deferred();
      const fetchMock = mockFetch({
        "GET /api/applications/a1": sentApplication(),
        "POST /api/applications/a1/interviews": () => post.promise,
      });
      renderDetail();
      const { dialog } = await openAddDialog();
      await userEvent.selectOptions(
        within(dialog).getByRole("combobox", { name: /Tipo/ }),
        "tecnica",
      );

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      const saving = await within(dialog).findByRole("button", {
        name: "Guardando…",
      });
      expect(saving).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(saving);
      await userEvent.keyboard("{Escape}");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Cerrar" }),
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Descartar cambios" }),
      );
      fireEvent.pointerDown(
        document.querySelector('[data-slot="dialog-overlay"]') as Element,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: "Añadir ronda", hidden: true }),
      ).toHaveAttribute("aria-disabled", "true");

      post.resolve(jsonResponse(interviewedApplication(), 201));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("never closes on a pointer-down outside the content", async () => {
      mockFetch({ "GET /api/applications/a1": sentApplication() });
      renderDetail();
      await openAddDialog();

      fireEvent.pointerDown(
        document.querySelector('[data-slot="dialog-overlay"]') as Element,
      );
      fireEvent.pointerDown(document.body);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("failed save", () => {
    it("keeps the dialog open with the typed values and clears the error on the next submit", async () => {
      const retry = deferred();
      let calls = 0;
      const fetchMock = mockFetch({
        "GET /api/applications/a1": sentApplication(),
        "POST /api/applications/a1/interviews": () => {
          calls += 1;
          return calls === 1 ? serverError() : retry.promise;
        },
      });
      renderDetail();
      const { dialog } = await openAddDialog();
      const type = within(dialog).getByRole("combobox", { name: /Tipo/ });
      await userEvent.selectOptions(type, "tecnica");
      const roundField = within(dialog).getByRole("spinbutton", {
        name: "Ronda",
      });
      await userEvent.clear(roundField);
      await userEvent.type(roundField, "5");

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      expect(
        await within(dialog).findByText(
          "No se pudo guardar la ronda. Inténtalo de nuevo.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(type).toHaveValue("tecnica");
      expect(roundField).toHaveValue(5);
      expect(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      ).toHaveAttribute("aria-disabled", "false");

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      await waitFor(() => expect(calls).toBe(2));
      expect(
        within(dialog).queryByText(
          "No se pudo guardar la ronda. Inténtalo de nuevo.",
        ),
      ).not.toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(2);
      retry.resolve(jsonResponse(interviewedApplication(), 201));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("feedback", () => {
    it("announces only «Ronda añadida.» when the status does not move, and clears it after 5 seconds", async () => {
      const kept = makeApplication({ interviews: [round()] });
      mockFetch({
        "GET /api/applications/a1": makeApplication(),
        "POST /api/applications/a1/interviews": () => jsonResponse(kept, 201),
      });
      renderDetail();
      await screen.findByRole("heading", { level: 1 });

      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        await user.click(screen.getByRole("button", { name: "Añadir ronda" }));
        const dialog = await screen.findByRole("dialog");
        await user.selectOptions(
          within(dialog).getByRole("combobox", { name: /Tipo/ }),
          "tecnica",
        );
        await user.click(
          within(dialog).getByRole("button", { name: "Guardar ronda" }),
        );

        await waitFor(() =>
          expect(within(roundsRegion()).getByRole("status")).toHaveTextContent(
            /^Ronda añadida\.$/,
          ),
        );
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        expect(
          within(roundsRegion()).getByRole("status"),
        ).toBeEmptyDOMElement();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("focus", () => {
    it.each([
      [
        "«Descartar cambios»",
        async (dialog: HTMLElement) => {
          await userEvent.click(
            within(dialog).getByRole("button", { name: "Descartar cambios" }),
          );
        },
      ],
      [
        "the X «Cerrar»",
        async (dialog: HTMLElement) => {
          await userEvent.click(
            within(dialog).getByRole("button", { name: "Cerrar" }),
          );
        },
      ],
      [
        "Escape",
        async () => {
          await userEvent.keyboard("{Escape}");
        },
      ],
    ])("returns to «Añadir ronda» after %s", async (_label, close) => {
      mockFetch({ "GET /api/applications/a1": sentApplication() });
      renderDetail();
      const { opener, dialog } = await openAddDialog();

      await close(dialog);

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(opener).toHaveFocus();
    });
  });

  describe("one mutation at a time", () => {
    it("keeps «Añadir ronda» aria-disabled and closed while a status PATCH is pending", async () => {
      const patch = deferred();
      mockFetch({
        "GET /api/applications/a1": makeApplication(),
        "PATCH /api/applications/a1/status": () => patch.promise,
      });
      renderDetail();
      const select = await statusSelect();

      await userEvent.selectOptions(select, "enviada");

      const add = screen.getByRole("button", { name: "Añadir ronda" });
      expect(add).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(add);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      patch.resolve(jsonResponse(sentApplication()));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Añadir ronda" }),
        ).toHaveAttribute("aria-disabled", "false"),
      );
    });

    it("sends no PATCH while a round is saving and releases busy when the POST settles", async () => {
      const post = deferred();
      const fetchMock = mockFetch({
        "GET /api/applications/a1": sentApplication(),
        "POST /api/applications/a1/interviews": () => post.promise,
        "PATCH /api/applications/a1/status": () =>
          jsonResponse(interviewedApplication()),
      });
      const { result } = renderHook(() =>
        useApplicationDetail("a1", { onDeleted: () => {} }),
      );
      await waitFor(() => expect(result.current.status).toBe("ok"));
      const vm = result.current.vm;
      if (vm === null) throw new Error("The application did not load");
      let added: Promise<void> = Promise.resolve();

      act(() => {
        added = result.current.interviewActions.add({
          ...vm.newInterviewValues,
          type: "tecnica",
        });
      });
      await waitFor(() =>
        expect(result.current.interviewActions.busy).toBe(true),
      );
      act(() => result.current.changeStatus("rechazada"));

      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
      ).toHaveLength(0);

      await act(async () => {
        post.resolve(jsonResponse(interviewedApplication(), 201));
        await added;
      });
      expect(result.current.interviewActions.busy).toBe(false);
      expect(result.current.vm?.interviews).toHaveLength(1);
    });
  });
});

describe("documents section", () => {
  const documentGets = (fetchMock: ReturnType<typeof mockFetch>) =>
    fetchMock.mock.calls.filter(([input, init]) => {
      const raw = typeof input === "string" ? input : String(input);
      return (
        (init?.method ?? "GET") === "GET" && raw.startsWith("/api/documents")
      );
    });

  const documentGetsOf = (
    fetchMock: ReturnType<typeof mockFetch>,
    path: string,
  ) =>
    fetchMock.mock.calls.filter(([input, init]) => {
      const raw = typeof input === "string" ? input : String(input);
      return (init?.method ?? "GET") === "GET" && raw === path;
    });

  const documentsRegion = () =>
    screen.findByRole("region", { name: "Documentos" });

  it("shows both rows without a request when nothing is linked", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
    });
    renderDetail();

    const section = await documentsRegion();
    expect(section).toHaveTextContent("Sin CV vinculado.");
    expect(section).toHaveTextContent("Sin carta vinculada.");
    expect(within(section).queryByRole("link")).not.toBeInTheDocument();
    expect(documentGets(fetchMock)).toHaveLength(0);
  });

  it("requests each linked document once and shows label, size and a download link", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication({
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
      }),
      "GET /api/documents/d1": makeDocument(),
      "GET /api/documents/d2": makeDocument({
        id: "d2",
        type: "carta",
        name: "Carta Lemoncode",
        version: "v1",
        fileName: "Carta.pdf",
        size: 1536,
        createdAt: "2026-10-14T10:00:00.000Z",
      }),
    });
    renderDetail();

    const cv = await screen.findByRole("link", {
      name: "Descargar CV Frontend",
    });
    expect(cv).toHaveAttribute("href", "/api/documents/d1/download");
    expect(cv).toHaveAttribute("download");
    const letter = await screen.findByRole("link", {
      name: "Descargar Carta Lemoncode",
    });
    expect(letter).toHaveAttribute("href", "/api/documents/d2/download");
    const section = await documentsRegion();
    expect(section).toHaveTextContent("CV Frontend · v3 · 12 oct. 2026");
    expect(section).toHaveTextContent("230 KB");
    expect(section).toHaveTextContent("Carta Lemoncode · v1 · 14 oct. 2026");
    expect(section).toHaveTextContent("1,5 KB");
    expect(documentGetsOf(fetchMock, "/api/documents/d1")).toHaveLength(1);
    expect(documentGetsOf(fetchMock, "/api/documents/d2")).toHaveLength(1);
    expect(section).not.toHaveAttribute("aria-busy", "true");
  });

  it("shows skeletons and a busy state for a loading row while the rest is rendered", async () => {
    const pending = deferred();
    mockFetch({
      "GET /api/applications/a1": makeApplication({ cvDocumentId: "d1" }),
      "GET /api/documents/d1": () => pending.promise,
    });
    renderDetail();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Frontend Developer",
    );
    const section = await documentsRegion();
    expect(section).toHaveAttribute("aria-busy", "true");
    expect(within(section).getByRole("status")).toHaveTextContent(
      "Cargando documentos…",
    );
    expect(section.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    expect(section).toHaveTextContent("Sin carta vinculada.");
    expect(
      screen.getByRole("region", { name: "Historial de estados" }),
    ).toBeInTheDocument();

    pending.resolve(jsonResponse(makeDocument()));
    expect(
      await screen.findByRole("link", { name: "Descargar CV Frontend" }),
    ).toBeInTheDocument();
    expect(section).not.toHaveAttribute("aria-busy", "true");
    expect(within(section).getByRole("status")).toBeEmptyDOMElement();
  });

  it("degrades only the row whose request answers 404", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
      }),
      "GET /api/documents/d1": () => notFoundResponse(),
      "GET /api/documents/d2": makeDocument({
        id: "d2",
        name: "Carta Lemoncode",
      }),
    });
    renderDetail();

    expect(
      await screen.findByRole("link", { name: "Descargar Carta Lemoncode" }),
    ).toBeInTheDocument();
    const section = await documentsRegion();
    const [cvRow] = within(section).getAllByRole("listitem");
    expect(cvRow).toHaveTextContent("No hemos podido cargar este documento.");
    expect(within(cvRow as HTMLElement).queryByRole("link")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Frontend Developer",
    );
  });

  it("degrades a row on a network failure too", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        coverLetterDocumentId: "d2",
      }),
      "GET /api/documents/d2": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderDetail();

    const section = await documentsRegion();
    await waitFor(() =>
      expect(section).toHaveTextContent(
        "No hemos podido cargar este documento.",
      ),
    );
    expect(section).toHaveTextContent("Sin CV vinculado.");
    expect(within(section).queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not refetch the documents after a status change that keeps the links", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication({ cvDocumentId: "d1" }),
      "GET /api/documents/d1": makeDocument(),
      "PATCH /api/applications/a1/status": makeApplication({
        cvDocumentId: "d1",
        status: "enviada",
        statusHistory: [
          { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
          { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
        ],
      }),
    });
    renderDetail();
    await screen.findByRole("link", { name: "Descargar CV Frontend" });

    await userEvent.selectOptions(await statusSelect(), "enviada");
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
      ).toHaveLength(1),
    );
    await waitFor(() =>
      expect(feedbackLine()).toHaveTextContent("Estado cambiado a Enviada."),
    );

    expect(documentGets(fetchMock)).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Descargar CV Frontend" }),
    ).toBeInTheDocument();
  });

  it("never shows the rows of the previous application after the id changes", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({ cvDocumentId: "d1" }),
      "GET /api/applications/a2": makeApplication({ id: "a2" }),
      "GET /api/documents/d1": makeDocument(),
    });
    const detail = (id: string) => (
      <ApplicationDetailContainer
        applicationId={id}
        onDeleted={() => {}}
        renderListLink={renderListLink}
        renderEditLink={renderEditLink}
        notice=""
        focusHeadingRef={() => {}}
      />
    );
    const view = render(detail("a1"));
    await screen.findByRole("link", { name: "Descargar CV Frontend" });

    view.rerender(detail("a2"));

    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Descargar CV Frontend" }),
      ).not.toBeInTheDocument(),
    );
    const section = await documentsRegion();
    expect(section).toHaveTextContent("Sin CV vinculado.");
  });
});
