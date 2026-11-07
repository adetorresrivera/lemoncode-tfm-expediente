import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import {
  applicationSchema,
  documentListItemSchema,
  documentSchema,
} from "@tfm/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "@/core/router/router";
import { jsonResponse, mockFetch, type MockHandler } from "./mock-fetch";

// D-13 / UI-SPEC §7: every message of the live-region inventory is announced by a region that was
// already in the DOM before the text arrived (a polite region created together with its text is not
// announced), except the block-level load errors, which stay `role="alert"` and are announced on
// insertion (Phase 2 precedent). A MutationObserver armed before the trigger tells the two apart.

const LIVE = '[role="status"], [aria-live="polite"], [role="alert"]';

type Matcher = string | RegExp;

const matches = (text: string, matcher: Matcher): boolean =>
  typeof matcher === "string" ? text.includes(matcher) : matcher.test(text);

// Watches the document for subtrees that carry `matcher` as they are added.
const watchAdditions = (matcher: Matcher) => {
  const added: Node[] = [];
  const record = (records: MutationRecord[]) => {
    for (const mutation of records) {
      for (const node of mutation.addedNodes) {
        if (matches(node.textContent ?? "", matcher)) added.push(node);
      }
    }
  };
  const observer = new MutationObserver(record);
  observer.observe(document.body, { childList: true, subtree: true });
  return {
    // True when `region` was inserted together with the text, that is, it was not there before.
    createdWithText: (region: Element): boolean => {
      record(observer.takeRecords());
      return added.some((node) => node === region || node.contains(region));
    },
    stop: () => observer.disconnect(),
  };
};

// Arms the watcher, runs the trigger, and checks the message landed in a live region that existed.
const expectAnnouncedInExistingRegion = async (
  matcher: Matcher,
  trigger: () => Promise<void> | void,
): Promise<HTMLElement> => {
  const watch = watchAdditions(matcher);
  try {
    await trigger();
    const message = await screen.findByText(matcher);
    const region = message.closest<HTMLElement>(LIVE);
    expect(region, `«${String(matcher)}» has no live ancestor`).not.toBeNull();
    if (region === null) throw new Error("unreachable");
    expect(
      watch.createdWithText(region),
      `the live region of «${String(matcher)}» was created together with its text`,
    ).toBe(false);
    return region;
  } finally {
    watch.stop();
  }
};

// ---- fixtures ------------------------------------------------------------------------------

const pending = () => new Promise<Response>(() => {});

const deferred = () => {
  let release: (response: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const serverError = () =>
  jsonResponse({ error: { code: "INTERNAL_ERROR", message: "fallo" } }, 500);

const noContent = () => new Response(null, { status: 204 });

const application = applicationSchema.parse({
  id: "a1",
  title: "Frontend Developer",
  company: "Lemoncode",
  status: "en_entrevistas",
  statusHistory: [
    { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
    { status: "en_entrevistas", at: "2026-10-20T10:00:00.000Z" },
  ],
  interviews: [
    {
      id: "i1",
      round: 1,
      type: "tecnica",
      mode: "online",
      scheduledAt: "2026-10-21T10:00:00.000Z",
      outcome: "pendiente",
      notes: null,
    },
  ],
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
  ownerId: null,
});

const stored = documentSchema.parse({
  id: "d1",
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "CV Frontend.pdf",
  s3Key: "documents/d1.pdf",
  mimeType: "application/pdf",
  size: 1024,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const listItem = documentListItemSchema.parse({ ...stored, usedBy: 0 });

const OFFER_TEXT =
  "Buscamos una persona frontend para un equipo de producto en Madrid.";

const EXTRACTION = {
  title: "Desarrollador/a Frontend Senior",
  company: "Lumen Analytics",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  tags: [],
};

const renderAt = (path: string) => {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
};

const pdf = () =>
  new File([new Uint8Array(1024)], "CV Frontend.pdf", {
    type: "application/pdf",
  });

// Opens the upload dialog on /documents and fills a valid PDF; the submit is left to the test.
const fillUploadDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByText("CV Frontend");
  await user.click(screen.getByRole("button", { name: "Subir documento" }));
  const dialog = await screen.findByRole("dialog", { name: "Subir documento" });
  await user.upload(within(dialog).getByLabelText(/Archivo/), pdf());
  await user.type(within(dialog).getByLabelText(/Versión/), "v3");
  return dialog;
};

// ---- helper self-test ----------------------------------------------------------------------

describe("live regions: the watcher tells the two cases apart", () => {
  const Message = ({ withRegion }: { withRegion: boolean }) => (
    <div>
      {withRegion ? <p role="status">Mensaje de prueba</p> : null}
      {!withRegion ? <p role="status" /> : null}
    </div>
  );

  it("flags a region inserted together with its text", async () => {
    const { rerender } = render(<div />);
    const watch = watchAdditions("Mensaje de prueba");

    rerender(<Message withRegion />);
    const region = screen.getByText("Mensaje de prueba");

    expect(watch.createdWithText(region)).toBe(true);
    watch.stop();
  });

  it("accepts text that arrives in a region that was already mounted", async () => {
    const { rerender } = render(<Message withRegion={false} />);
    const region = screen.getByRole("status");
    const watch = watchAdditions("Mensaje de prueba");

    region.append(document.createTextNode("Mensaje de prueba"));
    rerender(<Message withRegion={false} />);

    expect(watch.createdWithText(region)).toBe(false);
    watch.stop();
  });
});

// ---- arrival notices and feedback lines ----------------------------------------------------

describe("live regions: notices that arrive after mount", () => {
  it("announces «Candidatura eliminada.» in the list status line", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/applications/a1": application,
      "GET /api/applications": [],
      "DELETE /api/applications/a1": noContent,
    });
    renderAt("/applications/a1");

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("alertdialog");

    const region = await expectAnnouncedInExistingRegion(
      "Candidatura eliminada.",
      () =>
        user.click(
          within(dialog).getByRole("button", {
            name: "Eliminar candidatura",
          }),
        ),
    );

    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("announces «Documento eliminado.» in the documents feedback line", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/documents": [listItem],
      "DELETE /api/documents/d1": noContent,
    });
    renderAt("/documents");

    await user.click(
      await screen.findByRole("button", { name: "Eliminar CV Frontend" }),
    );
    const dialog = await screen.findByRole("alertdialog");

    await expectAnnouncedInExistingRegion("Documento eliminado.", () =>
      user.click(
        within(dialog).getByRole("button", { name: "Eliminar documento" }),
      ),
    );
  });

  it("announces the result counter changing from «1 candidatura» to «Sin candidaturas»", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/applications": ((url) =>
        jsonResponse(
          url.searchParams.has("q") ? [] : [application],
        )) satisfies MockHandler,
    });
    renderAt("/applications");

    const counter = await screen.findByText("1 candidatura");
    expect(counter).toHaveAttribute("aria-live", "polite");

    const region = await expectAnnouncedInExistingRegion(
      "Sin candidaturas",
      () => user.type(screen.getByLabelText("Buscar"), "zzz"),
    );

    expect(region).toBe(counter);
  });
});

// ---- loading lines -------------------------------------------------------------------------

describe("live regions: loading lines", () => {
  it.each([
    ["/applications", "GET /api/applications", "Cargando candidaturas…"],
    ["/applications/a1", "GET /api/applications/a1", "Cargando candidatura…"],
    [
      "/applications/a1/edit",
      "GET /api/applications/a1",
      "Cargando candidatura…",
    ],
    ["/documents", "GET /api/documents", "Cargando documentos…"],
  ])("%s announces «%s» through role=status", async (path, route, text) => {
    mockFetch({ [route]: pending });
    renderAt(path);

    const line = (await screen.findByText(text)).closest(LIVE);

    expect(line).not.toBeNull();
    expect(line).toHaveAttribute("role", "status");
  });
});

// ---- block-level load errors ---------------------------------------------------------------

describe("live regions: block-level load errors", () => {
  it.each([
    [
      "/applications",
      "GET /api/applications",
      "No se pudieron cargar las candidaturas",
    ],
    [
      "/applications/a1",
      "GET /api/applications/a1",
      "No se pudo cargar la candidatura",
    ],
    [
      "/applications/a1/edit",
      "GET /api/applications/a1",
      "No se pudo cargar la candidatura",
    ],
    [
      "/documents",
      "GET /api/documents",
      "No se pudieron cargar los documentos",
    ],
  ])("%s inserts a role=alert card headed «%s»", async (path, route, title) => {
    mockFetch({ [route]: serverError });
    renderAt(path);

    const alert = await screen.findByRole("alert");

    expect(
      within(alert).getByRole("heading", { name: title }),
    ).toBeInTheDocument();
  });
});

// ---- AI panel ------------------------------------------------------------------------------

describe("live regions: AI panel", () => {
  const pasteOffer = () => {
    fireEvent.change(screen.getByLabelText("Texto de la oferta"), {
      target: { value: OFFER_TEXT },
    });
  };

  it("announces «Analizando la oferta…» and then the result in the same always-mounted region", async () => {
    const user = userEvent.setup();
    const extraction = deferred();
    mockFetch({ "POST /api/offers/extract": () => extraction.promise });
    renderAt("/applications/new");
    await screen.findByLabelText("Texto de la oferta");
    pasteOffer();

    const analysing = await expectAnnouncedInExistingRegion(
      "Analizando la oferta…",
      () =>
        user.click(
          screen.getByRole("button", { name: "Autocompletar con IA" }),
        ),
    );
    const result = await expectAnnouncedInExistingRegion(
      /^Hemos rellenado/,
      () => extraction.release(jsonResponse(EXTRACTION)),
    );

    expect(result).toBe(analysing);
  });

  it("announces a failed analysis in the same region", async () => {
    const user = userEvent.setup();
    const extraction = deferred();
    mockFetch({ "POST /api/offers/extract": () => extraction.promise });
    renderAt("/applications/new");
    await screen.findByLabelText("Texto de la oferta");
    pasteOffer();
    await user.click(
      screen.getByRole("button", { name: "Autocompletar con IA" }),
    );
    await screen.findByText("Analizando la oferta…");

    await expectAnnouncedInExistingRegion(
      "No hemos podido leer la oferta. Inténtalo otra vez o rellena el formulario a mano.",
      () =>
        extraction.release(
          jsonResponse({ error: { code: "LLM_ERROR", message: "x" } }, 502),
        ),
    );
  });
});

// ---- upload --------------------------------------------------------------------------------

describe("live regions: upload", () => {
  it("announces «Subiendo el archivo…» and the close-blocked sentence inside the dialog", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/documents": [listItem],
      "POST /api/documents": pending,
    });
    renderAt("/documents");
    const dialog = await fillUploadDialog(user);

    await expectAnnouncedInExistingRegion("Subiendo el archivo…", () =>
      user.click(
        within(dialog).getByRole("button", { name: "Subir documento" }),
      ),
    );
    await within(dialog).findByRole("button", { name: "Cancelar subida" });

    await expectAnnouncedInExistingRegion(
      "Cancela la subida para cerrar.",
      () => user.keyboard("{Escape}"),
    );
  });

  it("announces «Documento subido.» outside the dialog once the server answers 201", async () => {
    const user = userEvent.setup();
    const created = deferred();
    mockFetch({
      "GET /api/documents": [listItem],
      "POST /api/documents": () => created.promise,
    });
    renderAt("/documents");
    const dialog = await fillUploadDialog(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Subir documento" }),
    );
    await within(dialog).findByRole("button", { name: "Cancelar subida" });

    await expectAnnouncedInExistingRegion("Documento subido.", () =>
      created.release(jsonResponse(stored, 201)),
    );
  });
});

// ---- dialog lock ---------------------------------------------------------------------------

describe("live regions: dialogs with an in-flight lock", () => {
  it("announces «Espera a que termine para cerrar.» in the round dialog while it saves", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/applications/a1": application,
      "PUT /api/applications/a1/interviews/i1": pending,
    });
    renderAt("/applications/a1");

    await user.click(
      await screen.findByRole("button", { name: "Editar ronda 1" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );
    await within(dialog).findByRole("button", { name: "Guardando…" });

    await expectAnnouncedInExistingRegion(
      "Espera a que termine para cerrar.",
      () => user.keyboard("{Escape}"),
    );
  });
});
