import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import {
  applicationSchema,
  documentListItemSchema,
  documentSchema,
  tagSummarySchema,
} from "@tfm/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "@/core/router/router";
import { checkA11y, summarizeViolations } from "./axe";
import { jsonResponse, mockFetch } from "./mock-fetch";

// D-13 / D-11: axe-core (every rule except `color-contrast`, which jsdom cannot evaluate) over each
// screen and state of the demo, in light and in dark. The route-error screen lives in
// core/router/route-error.test.tsx because it needs a mocked scene.

const serverError = () =>
  jsonResponse({ error: { code: "INTERNAL_ERROR", message: "fallo" } }, 500);

const notFound = () =>
  jsonResponse({ error: { code: "NOT_FOUND", message: "no existe" } }, 404);

const application = applicationSchema.parse({
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
  status: "en_entrevistas",
  statusHistory: [
    { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
    { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
    { status: "en_entrevistas", at: "2026-10-20T10:00:00.000Z" },
  ],
  tags: [
    { label: "React", group: "stack" },
    { label: "TypeScript", group: "stack" },
    { label: "Testing", group: "nice_to_have" },
  ],
  interviews: [
    {
      id: "i1",
      round: 1,
      type: "tecnica",
      mode: "online",
      scheduledAt: "2026-10-21T10:00:00.000Z",
      outcome: "superada",
      notes: null,
    },
  ],
  notes: "Notas guardadas",
  sourceUrl: "https://ofertas.example/frontend",
  offerText: "Buscamos a alguien con ganas.",
  cvDocumentId: "d1",
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
  ownerId: null,
});

const cv = documentSchema.parse({
  id: "d1",
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "CV Frontend.pdf",
  s3Key: "documents/d1.pdf",
  mimeType: "application/pdf",
  size: 235520,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const listItem = documentListItemSchema.parse({ ...cv, usedBy: 1 });

const tags = [
  tagSummarySchema.parse({ label: "React", group: "stack", count: 2 }),
  tagSummarySchema.parse({ label: "Testing", group: "nice_to_have", count: 1 }),
];

const populated = {
  "GET /api/applications": [application],
  "GET /api/applications/a1": application,
  "GET /api/tags": tags,
  "GET /api/documents": [listItem],
  "GET /api/documents/d1": cv,
};

const renderAt = (path: string) => {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
};

const expectNoViolations = async () => {
  expect(summarizeViolations(await checkA11y())).toEqual([]);
};

describe("axe helper", () => {
  it("reports a violation on markup that breaks a rule, so a clean run means something", async () => {
    render(<img src="/x.png" />);

    const found = summarizeViolations(await checkA11y());

    expect(found.map((violation) => violation.id)).toContain("image-alt");
  });
});

describe.each(["light", "dark"] as const)("axe, %s theme", (theme) => {
  const setTheme = () => {
    // setup.ts clears the root class after every test.
    if (theme === "dark") document.documentElement.classList.add("dark");
  };

  it("populated list", async () => {
    setTheme();
    mockFetch(populated);
    renderAt("/applications");

    await screen.findAllByText("Frontend Developer");
    await expectNoViolations();
  });

  it("empty list", async () => {
    setTheme();
    mockFetch({ "GET /api/applications": [] });
    renderAt("/applications");

    await screen.findByText(
      "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.",
    );
    await expectNoViolations();
  });

  it("list load error", async () => {
    setTheme();
    mockFetch({ "GET /api/applications": serverError });
    renderAt("/applications");

    await screen.findByRole("heading", {
      name: "No se pudieron cargar las candidaturas",
    });
    await expectNoViolations();
  });

  it("detail with a round and a linked document", async () => {
    setTheme();
    mockFetch(populated);
    renderAt("/applications/a1");

    await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    await screen.findByRole("link", { name: /^Descargar / });
    await expectNoViolations();
  });

  it("detail not found card", async () => {
    setTheme();
    mockFetch({ "GET /api/applications/a1": notFound });
    renderAt("/applications/a1");

    await screen.findByRole("heading", {
      name: "No encontramos esta candidatura",
    });
    await expectNoViolations();
  });

  it("create form with the AI panel", async () => {
    setTheme();
    mockFetch({ "GET /api/documents": [listItem], "GET /api/tags": tags });
    renderAt("/applications/new");

    await screen.findByRole("heading", {
      level: 1,
      name: "Añadir candidatura",
    });
    await screen.findByLabelText("Texto de la oferta");
    await expectNoViolations();
  });

  it("documents populated", async () => {
    setTheme();
    mockFetch({ "GET /api/documents": [listItem] });
    renderAt("/documents");

    await screen.findByText("CV Frontend");
    await expectNoViolations();
  });

  it("documents empty", async () => {
    setTheme();
    mockFetch({ "GET /api/documents": [] });
    renderAt("/documents");

    await screen.findByText(
      "Aún no has subido ningún documento. Empieza subiendo tu CV.",
    );
    await expectNoViolations();
  });

  it("open «Añadir ronda» dialog", async () => {
    setTheme();
    const user = userEvent.setup();
    mockFetch(populated);
    renderAt("/applications/a1");

    await screen.findByRole("heading", {
      level: 1,
      name: "Frontend Developer",
    });
    await user.click(screen.getByRole("button", { name: "Añadir ronda" }));
    await screen.findByRole("dialog");
    await expectNoViolations();
  });

  it("open mobile menu Sheet", async () => {
    setTheme();
    const user = userEvent.setup();
    mockFetch(populated);
    renderAt("/applications");

    await screen.findAllByText("Frontend Developer");
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await screen.findByRole("dialog");
    await expectNoViolations();
  });

  it("not found screen", async () => {
    setTheme();
    renderAt("/nope");

    await screen.findByRole("heading", {
      level: 1,
      name: "No encontramos esta página",
    });
    await expectNoViolations();
  });
});
