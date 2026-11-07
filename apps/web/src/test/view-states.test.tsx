import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import {
  applicationSchema,
  documentListItemSchema,
  documentSchema,
} from "@tfm/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "@/core/router/router";
import { jsonResponse, mockFetch } from "./mock-fetch";

// D-11: loading, error and empty (and partial) states of every view, reviewed through the router.
// The copy asserted is the approved copy of Phases 2-5; a server message placed in a 500 body must
// never reach the page.

const SERVER_LEAK = "fallo-interno-xyz";

const pending = () => new Promise<Response>(() => {});

const serverError = () =>
  jsonResponse(
    { error: { code: "INTERNAL_ERROR", message: SERVER_LEAK } },
    500,
  );

const notFound = () =>
  jsonResponse({ error: { code: "NOT_FOUND", message: SERVER_LEAK } }, 404);

const makeApplication = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Lemoncode",
    location: "Madrid",
    workMode: "remoto",
    seniority: "senior",
    contractType: "indefinido",
    salaryMin: 50000,
    salaryMax: 60000,
    currency: "EUR",
    status: "guardada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    notes: "Notas guardadas",
    sourceUrl: "https://ofertas.example/frontend",
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ownerId: null,
    ...overrides,
  });

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

const makeListItem = (overrides: Record<string, unknown> = {}) =>
  documentListItemSchema.parse({ ...makeDocument(), usedBy: 0, ...overrides });

const renderAt = (path: string) => {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
  return router;
};

const loadingLine = (text: string) => {
  const line = screen.getByText(text).closest('[role="status"]');
  if (line === null) throw new Error(`«${text}» is not inside a status region`);
  return line;
};

// A field is found by its visible label (the label text carries a « *» mark when required).
const control = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), {
    selector: "input, textarea",
  });

const controlValue = (label: string): string => {
  const element = control(label);
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement)
  ) {
    throw new Error(`«${label}» is not a text control`);
  }
  return element.value;
};

const expectNoServerMessage = () =>
  expect(document.body).not.toHaveTextContent(SERVER_LEAK);

describe("view states: application list", () => {
  it("shows a loading line and the skeleton while the request is pending, with no empty copy", async () => {
    mockFetch({ "GET /api/applications": pending });
    renderAt("/applications");

    expect(
      await screen.findByText("Cargando candidaturas…"),
    ).toBeInTheDocument();
    expect(loadingLine("Cargando candidaturas…")).toBeInTheDocument();
    expect(
      screen.queryByText(/Aún no has guardado ninguna oferta/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert card with «Reintentar» and never the server message when the request fails", async () => {
    mockFetch({ "GET /api/applications": serverError });
    renderAt("/applications");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudieron cargar las candidaturas",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expectNoServerMessage();
  });

  it("shows the cards after «Reintentar» is answered with a 200", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "GET /api/applications": () => {
        calls += 1;
        return calls === 1 ? serverError() : jsonResponse([makeApplication()]);
      },
    });
    renderAt("/applications");

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the absolute empty copy and «Añadir candidatura» when the answer is empty", async () => {
    mockFetch({ "GET /api/applications": [] });
    renderAt("/applications");

    expect(
      await screen.findByText(
        "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Añadir candidatura" }),
    ).toHaveAttribute("href", "/applications/new");
  });
});

describe("view states: application detail", () => {
  it("shows a loading line and the skeleton while the request is pending", async () => {
    mockFetch({ "GET /api/applications/a1": pending });
    renderAt("/applications/a1");

    expect(
      await screen.findByText("Cargando candidatura…"),
    ).toBeInTheDocument();
    expect(loadingLine("Cargando candidatura…")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows «No encontramos esta candidatura» with its way back on a 404", async () => {
    mockFetch({ "GET /api/applications/a1": notFound });
    renderAt("/applications/a1");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No encontramos esta candidatura",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
    expectNoServerMessage();
  });

  it("shows «No se pudo cargar la candidatura» with its retry on a 500", async () => {
    mockFetch({ "GET /api/applications/a1": serverError });
    renderAt("/applications/a1");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudo cargar la candidatura",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expectNoServerMessage();
  });

  it("shows the rounds and documents empty copy for an application with neither", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderAt("/applications/a1");

    expect(
      await screen.findByText(
        "Aún no hay rondas. Añade la primera cuando te convoquen.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin CV vinculado.")).toBeInTheDocument();
    expect(screen.getByText("Sin carta vinculada.")).toBeInTheDocument();
  });

  it("degrades only the document row whose lookup fails", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
      }),
      "GET /api/documents/d1": serverError,
      "GET /api/documents/d2": makeDocument({
        id: "d2",
        type: "carta",
        name: "Carta Lemoncode",
      }),
    });
    renderAt("/applications/a1");

    expect(
      await screen.findByRole("link", { name: "Descargar Carta Lemoncode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No hemos podido cargar este documento."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Frontend Developer",
    );
    expectNoServerMessage();
  });
});

describe("view states: create form", () => {
  it("shows every field with a visible label and an empty value, and an idle AI panel", async () => {
    renderAt("/applications/new");

    await screen.findByRole("heading", {
      level: 1,
      name: "Añadir candidatura",
    });
    for (const label of [
      "Puesto",
      "Empresa",
      "Ubicación",
      "Salario mínimo",
      "Salario máximo",
      "Fecha de envío",
      "Enlace de la oferta",
      "Notas",
    ]) {
      expect(controlValue(label)).toBe("");
    }
    expect(screen.queryByText("Analizando la oferta…")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/La IA ha tardado demasiado/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("view states: edit form", () => {
  it("shows a loading line while the request is pending", async () => {
    mockFetch({ "GET /api/applications/a1": pending });
    renderAt("/applications/a1/edit");

    expect(
      await screen.findByText("Cargando candidatura…"),
    ).toBeInTheDocument();
    expect(loadingLine("Cargando candidatura…")).toBeInTheDocument();
  });

  it("shows its error card with «Reintentar» on a 500", async () => {
    mockFetch({ "GET /api/applications/a1": serverError });
    renderAt("/applications/a1/edit");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudo cargar la candidatura",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expectNoServerMessage();
  });

  it("prefills every saved field on a 200", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderAt("/applications/a1/edit");

    await waitFor(() =>
      expect(control("Puesto")).toHaveValue("Frontend Developer"),
    );
    expect(control("Empresa")).toHaveValue("Lemoncode");
    expect(control("Ubicación")).toHaveValue("Madrid");
    expect(control("Salario mínimo")).toHaveValue(50000);
    expect(control("Salario máximo")).toHaveValue(60000);
    expect(control("Enlace de la oferta")).toHaveValue(
      "https://ofertas.example/frontend",
    );
    expect(control("Notas")).toHaveValue("Notas guardadas");
  });
});

describe("view states: documents", () => {
  it("shows a loading line while the request is pending", async () => {
    mockFetch({ "GET /api/documents": pending });
    renderAt("/documents");

    expect(await screen.findByText("Cargando documentos…")).toBeInTheDocument();
    expect(loadingLine("Cargando documentos…")).toBeInTheDocument();
  });

  it("shows an alert card with «Reintentar» and never the server message on a 500", async () => {
    mockFetch({ "GET /api/documents": serverError });
    renderAt("/documents");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudieron cargar los documentos",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expectNoServerMessage();
  });

  it("shows the empty copy and the upload action when the answer is empty", async () => {
    mockFetch({ "GET /api/documents": [] });
    renderAt("/documents");

    expect(
      await screen.findByText(
        "Aún no has subido ningún documento. Empieza subiendo tu CV.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subir documento" }),
    ).toBeInTheDocument();
  });

  it("keeps the rows with aria-busy while a refetch is in flight", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "GET /api/documents": () => {
        calls += 1;
        return calls === 1 ? jsonResponse([makeListItem()]) : pending();
      },
    });
    renderAt("/documents");

    expect(await screen.findByText("CV Frontend")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "CV" }));

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Resultados" }),
      ).toHaveAttribute("aria-busy", "true"),
    );
    expect(screen.getByText("CV Frontend")).toBeInTheDocument();
  });

  it("never renders a partial list when one row of the answer is invalid", async () => {
    // The library is one request (there is no per-row lookup): a row that cannot be read fails the
    // whole answer with the fixed Spanish card, never a half-rendered list. The per-row
    // degradation of linked documents is the detail aside, covered in the detail describe.
    mockFetch({
      "GET /api/documents": [makeListItem(), { id: "x", name: SERVER_LEAK }],
    });
    renderAt("/documents");

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudieron cargar los documentos",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("CV Frontend")).not.toBeInTheDocument();
    expectNoServerMessage();
  });
});
