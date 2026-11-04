import { documentListItemSchema } from "@tfm/contracts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { DocumentListContainer } from "./document-list.container";
import {
  countLabel,
  mapDocumentListFromApiToVm,
  usageLabel,
} from "./document-list.mapper";

const makeItem = (overrides: Record<string, unknown> = {}) =>
  documentListItemSchema.parse({
    id: "d1",
    type: "cv",
    name: "CV Frontend",
    version: "v3",
    fileName: "cv-frontend.pdf",
    s3Key: "documents/d1/cv-frontend.pdf",
    mimeType: "application/pdf",
    size: 235520,
    createdAt: "2026-10-12T10:00:00.000Z",
    usedBy: 1,
    ...overrides,
  });

const cv = makeItem();
const carta = makeItem({
  id: "d2",
  type: "carta",
  name: "Carta Lemoncode",
  version: "v1",
  fileName: "carta.docx",
  s3Key: "documents/d2/carta.docx",
  mimeType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 1024,
  createdAt: "2026-10-11T10:00:00.000Z",
  usedBy: 0,
});

type Props = ComponentProps<typeof DocumentListContainer>;

const renderHeader: Props["renderHeader"] = ({ counter }) => (
  <header aria-label="Cabecera">{counter}</header>
);

function renderList(props: Partial<Props> = {}) {
  const onTypeChange = vi.fn();
  const view = render(
    <DocumentListContainer
      type={undefined}
      onTypeChange={onTypeChange}
      refreshToken={0}
      renderHeader={renderHeader}
      {...props}
    />,
  );
  const rerender = (next: Partial<Props>) =>
    view.rerender(
      <DocumentListContainer
        type={undefined}
        onTypeChange={onTypeChange}
        refreshToken={0}
        renderHeader={renderHeader}
        {...props}
        {...next}
      />,
    );
  return { onTypeChange, rerender };
}

const deferred = () => {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const listCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(
    ([input, init]) =>
      String(input).startsWith("/api/documents") &&
      (init?.method ?? "GET") === "GET",
  );

describe("document list mapper", () => {
  it("labels the use of a document and nothing at zero", () => {
    expect(usageLabel(0)).toBeNull();
    expect(usageLabel(1)).toBe("En uso en 1 candidatura");
    expect(usageLabel(3)).toBe("En uso en 3 candidaturas");
  });

  it("labels the counter by count and nothing while it is unknown", () => {
    expect(countLabel(null)).toBe("");
    expect(countLabel(0)).toBe("Sin documentos");
    expect(countLabel(1)).toBe("1 documento");
    expect(countLabel(2)).toBe("2 documentos");
  });

  it("maps a document to its row with every label", () => {
    const [row] = mapDocumentListFromApiToVm([
      makeItem({ name: "CV Frontend/ES #1" }),
    ]);

    expect(row).toStrictEqual({
      id: "d1",
      name: "CV Frontend/ES #1",
      version: "v3",
      type: "cv",
      typeLabel: "CV",
      createdAt: "2026-10-12T10:00:00.000Z",
      dateLabel: "12 oct. 2026",
      sizeLabel: "230 KB",
      usageLabel: "En uso en 1 candidatura",
      downloadHref: "/api/documents/d1/download",
      downloadLabel: "Descargar CV Frontend/ES #1",
      deleteLabel: "Eliminar CV Frontend/ES #1",
    });
  });

  it("encodes the id in the download link", () => {
    const [row] = mapDocumentListFromApiToVm([makeItem({ id: "a/b c" })]);

    expect(row?.downloadHref).toBe("/api/documents/a%2Fb%20c/download");
  });
});

describe("document list", () => {
  it("lists every document in the API order with its counter", async () => {
    mockFetch({ "GET /api/documents": [cv, carta] });
    renderList();

    const list = await screen.findByRole("list", { name: "Documentos" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0] as HTMLElement).getByRole("heading", {
        level: 2,
        name: "CV Frontend",
      }),
    ).toBeInTheDocument();
    expect(
      within(rows[1] as HTMLElement).getByRole("heading", {
        level: 2,
        name: "Carta Lemoncode",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("banner", { name: "Cabecera" })).getByText(
        "2 documentos",
      ),
    ).toBeInTheDocument();
  });

  it("shows type, version, date, size and use in the row of a linked CV", async () => {
    mockFetch({ "GET /api/documents": [cv, carta] });
    renderList();

    const [cvRow, cartaRow] = await screen
      .findByRole("list", { name: "Documentos" })
      .then((list) => within(list).getAllByRole("listitem"));
    const row = within(cvRow as HTMLElement);

    expect(row.getByText("CV")).toBeInTheDocument();
    expect(row.getByText("v3")).toBeInTheDocument();
    expect(row.getByText("Versión:")).toHaveClass("sr-only");
    expect(row.getByText("12 oct. 2026")).toHaveAttribute(
      "datetime",
      "2026-10-12T10:00:00.000Z",
    );
    expect(row.getByText("Subido:")).toHaveClass("sr-only");
    expect(row.getByText("230 KB")).toBeInTheDocument();
    expect(row.getByText("En uso en 1 candidatura")).toBeInTheDocument();

    const cartaScope = within(cartaRow as HTMLElement);
    expect(cartaScope.getByText("Carta")).toBeInTheDocument();
    expect(cartaScope.queryByText(/En uso en/)).not.toBeInTheDocument();
  });

  it("links every row to its download and keeps «Eliminar» enabled even when in use", async () => {
    mockFetch({ "GET /api/documents": [cv, carta] });
    renderList();

    const link = await screen.findByRole("link", {
      name: "Descargar CV Frontend",
    });
    expect(link).toHaveAttribute("href", "/api/documents/d1/download");
    expect(link).toHaveAttribute("download");
    expect(
      screen.getByRole("link", { name: "Descargar Carta Lemoncode" }),
    ).toHaveAttribute("href", "/api/documents/d2/download");
    expect(
      screen.getByRole("button", { name: "Eliminar CV Frontend" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Eliminar Carta Lemoncode" }),
    ).toBeEnabled();
  });

  it("requests the type and presses its item", async () => {
    const fetchMock = mockFetch({ "GET /api/documents": [carta] });
    renderList({ type: "carta" });

    await screen.findByRole("list", { name: "Documentos" });
    expect(
      new URL(
        String(listCalls(fetchMock)[0]?.[0]),
        "http://localhost",
      ).searchParams.get("type"),
    ).toBe("carta");
    expect(screen.getByRole("radio", { name: "Carta" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Todos" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(
      screen.getByRole("group", { name: "Tipo de documento" }),
    ).toBeInTheDocument();
  });

  it("sends no type parameter for Todos", async () => {
    const fetchMock = mockFetch({ "GET /api/documents": [cv] });
    renderList();

    await screen.findByRole("list", { name: "Documentos" });
    expect(String(listCalls(fetchMock)[0]?.[0])).toBe("/api/documents");
    expect(screen.getByRole("radio", { name: "Todos" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("reports the chosen type, Todos as undefined and ignores the pressed item", async () => {
    mockFetch({ "GET /api/documents": [cv] });
    const user = userEvent.setup();
    const { onTypeChange } = renderList({ type: "carta" });
    await screen.findByRole("list", { name: "Documentos" });

    await user.click(screen.getByRole("radio", { name: "CV" }));
    expect(onTypeChange).toHaveBeenLastCalledWith("cv");

    await user.click(screen.getByRole("radio", { name: "Todos" }));
    expect(onTypeChange).toHaveBeenLastCalledWith(undefined);

    onTypeChange.mockClear();
    await user.click(screen.getByRole("radio", { name: "Carta" }));
    expect(onTypeChange).not.toHaveBeenCalled();
  });

  it("shows three skeleton rows and a status on the first load", async () => {
    const pending = deferred();
    mockFetch({ "GET /api/documents": () => pending.promise });
    renderList();

    const label = await screen.findByText("Cargando documentos…");
    expect(label).toHaveClass("sr-only");
    const status = label.closest('[role="status"]');
    if (status === null) throw new Error("The skeleton has no status role");
    expect(
      status.querySelectorAll(':scope > [aria-hidden="true"]'),
    ).toHaveLength(3);
    expect(
      screen.queryByRole("list", { name: "Documentos" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("banner", { name: "Cabecera" })).queryByText(
        /documento/,
      ),
    ).not.toBeInTheDocument();

    pending.resolve(jsonResponse([cv]));
    expect(
      await screen.findByRole("list", { name: "Documentos" }),
    ).toBeInTheDocument();
  });

  it("keeps the rows and the counter, marking the region busy, while a refresh is in flight", async () => {
    const second = deferred();
    let calls = 0;
    mockFetch({
      "GET /api/documents": () => {
        calls += 1;
        return calls === 1 ? jsonResponse([cv, carta]) : second.promise;
      },
    });
    const { rerender } = renderList();
    await screen.findByRole("list", { name: "Documentos" });
    const region = screen.getByRole("region", { name: "Resultados" });
    expect(region).toHaveAttribute("aria-busy", "false");

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(region).toHaveAttribute("aria-busy", "true"));
    expect(
      screen.getByRole("list", { name: "Documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 documentos")).toBeInTheDocument();
    expect(screen.queryByText("Cargando documentos…")).not.toBeInTheDocument();

    second.resolve(
      jsonResponse([cv, carta, makeItem({ id: "d3", name: "Nuevo" })]),
    );
    expect(await screen.findByText("3 documentos")).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-busy", "false");
  });

  it("shows an alert with the body of a server failure and retries moving focus to the results", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/documents": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "boom" } },
              500,
            )
          : jsonResponse([cv]);
      },
    });
    const user = userEvent.setup();
    renderList();

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByRole("heading", {
        name: "No se pudieron cargar los documentos",
      }),
    ).toBeInTheDocument();
    expect(
      within(alert).getByText("Algo ha fallado. Inténtalo de nuevo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("boom")).not.toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("list", { name: "Documentos" }),
    ).toBeInTheDocument();
    expect(listCalls(fetchMock)).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Resultados" })).toHaveFocus();
  });

  it("shows the network body when the server cannot be reached", async () => {
    mockFetch({
      "GET /api/documents": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderList();

    expect(
      await screen.findByText(
        "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
  });

  it("invites to upload the first CV when the library is empty and offers no second button", async () => {
    mockFetch({ "GET /api/documents": [] });
    renderList();

    expect(
      await screen.findByText(
        "Aún no has subido ningún documento. Empieza subiendo tu CV.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin documentos")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver todos los documentos" }),
    ).not.toBeInTheDocument();
  });

  it("names the missing type when a filter is empty and goes back to Todos", async () => {
    mockFetch({ "GET /api/documents": [] });
    const user = userEvent.setup();
    const { onTypeChange } = renderList({ type: "carta" });

    expect(
      await screen.findByText("Aún no has subido ninguna carta."),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Ver todos los documentos" }),
    );
    expect(onTypeChange).toHaveBeenCalledWith(undefined);
  });

  it("names the missing CV when the CV filter is empty", async () => {
    mockFetch({ "GET /api/documents": [] });
    renderList({ type: "cv" });

    expect(
      await screen.findByText("Aún no has subido ningún CV."),
    ).toBeInTheDocument();
  });

  it("lets a 120-character name and a 40-character version wrap", async () => {
    const name = "N".repeat(120);
    const version = "V".repeat(40);
    mockFetch({ "GET /api/documents": [makeItem({ name, version })] });
    renderList();

    const heading = await screen.findByRole("heading", { level: 2, name });
    expect(heading).toHaveClass("break-words");
    expect(heading.closest(".min-w-0")).not.toBeNull();
    expect(screen.getByText(version).closest(".break-words")).not.toBeNull();
  });
});

describe("delete from the library", () => {
  const noContent = () => new Response(null, { status: 204 });

  const inUse = () =>
    jsonResponse(
      {
        error: {
          code: "DOCUMENT_IN_USE",
          message: "El documento está vinculado a una candidatura",
        },
      },
      409,
    );

  const openDialog = async (
    user: ReturnType<typeof userEvent.setup>,
    name = "CV Frontend",
  ) => {
    await user.click(
      await screen.findByRole("button", { name: `Eliminar ${name}` }),
    );
    return screen.findByRole("alertdialog", {
      name: "¿Eliminar este documento?",
    });
  };

  const deleteRequests = (fetchMock: ReturnType<typeof mockFetch>) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");

  it("opens a confirmation with the name and version and focus on «Conservar documento»", async () => {
    mockFetch({ "GET /api/documents": [cv, carta] });
    const user = userEvent.setup();
    renderList();

    const dialog = await openDialog(user);

    expect(
      within(dialog).getByText(
        "Vas a eliminar «CV Frontend» (v3). Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Conservar documento" }),
    ).toHaveFocus();
  });

  it("sends one DELETE while pending, ignores close requests and disables both buttons", async () => {
    const pending = deferred();
    const fetchMock = mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": () => pending.promise,
    });
    const user = userEvent.setup();
    renderList();
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Eliminar documento" }),
    );

    const confirm = await within(dialog).findByRole("button", {
      name: "Eliminando…",
    });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(
      within(dialog).getByRole("button", { name: "Conservar documento" }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.keyboard("{Escape}");
    await user.click(confirm);
    await user.click(
      within(dialog).getByRole("button", { name: "Conservar documento" }),
    );

    expect(
      screen.getByRole("alertdialog", { name: "¿Eliminar este documento?" }),
    ).toBeInTheDocument();
    expect(deleteRequests(fetchMock)).toHaveLength(1);

    pending.resolve(noContent());
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("keeps the dialog and the row on a 409 with the rule-4 sentence and lets the user try again", async () => {
    const fetchMock = mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": inUse,
    });
    const user = userEvent.setup();
    renderList();
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Eliminar documento" }),
    );

    expect(
      await within(dialog).findByText(
        "Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(
        "El documento está vinculado a una candidatura",
      ),
    ).not.toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", {
      name: "Eliminar documento",
    });
    expect(confirm).toHaveAttribute("aria-disabled", "false");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "CV Frontend",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 documentos")).toBeInTheDocument();
    expect(screen.queryByText("Documento eliminado.")).not.toBeInTheDocument();

    await user.click(confirm);
    await waitFor(() => expect(deleteRequests(fetchMock)).toHaveLength(2));
  });

  it("shows the generic sentence on any other failure", async () => {
    mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": () =>
        jsonResponse(
          { error: { code: "INTERNAL_ERROR", message: "boom" } },
          500,
        ),
    });
    const user = userEvent.setup();
    renderList();
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Eliminar documento" }),
    );

    expect(
      await within(dialog).findByText(
        "No se pudo eliminar el documento. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "CV Frontend",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("removes the row only after the 204, without a new GET, and announces it", async () => {
    const pending = deferred();
    const fetchMock = mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": () => pending.promise,
    });
    const user = userEvent.setup();
    renderList();
    const dialog = await openDialog(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Eliminar documento" }),
    );
    await within(dialog).findByRole("button", { name: "Eliminando…" });
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "CV Frontend",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Documento eliminado.")).not.toBeInTheDocument();

    pending.resolve(noContent());

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: "CV Frontend" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 documento")).toBeInTheDocument();
    expect(screen.getByText("Documento eliminado.")).toBeInTheDocument();
    expect(listCalls(fetchMock)).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Resultados" })).toHaveFocus(),
    );
  });

  it("clears «Documento eliminado.» after 5 s", async () => {
    mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": noContent,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderList();
      const dialog = await openDialog(user);
      await user.click(
        within(dialog).getByRole("button", { name: "Eliminar documento" }),
      );
      expect(
        await screen.findByText("Documento eliminado."),
      ).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(4900);
      });
      expect(screen.getByText("Documento eliminado.")).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByText("Documento eliminado.")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes on «Conservar documento» and returns focus to that row's button", async () => {
    const fetchMock = mockFetch({ "GET /api/documents": [cv, carta] });
    const user = userEvent.setup();
    renderList();
    const dialog = await openDialog(user, "Carta Lemoncode");

    await user.click(
      within(dialog).getByRole("button", { name: "Conservar documento" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Eliminar Carta Lemoncode" }),
      ).toHaveFocus(),
    );
    expect(deleteRequests(fetchMock)).toHaveLength(0);
  });

  it("opens with no leftover error after a failed attempt on another document", async () => {
    mockFetch({
      "GET /api/documents": [cv, carta],
      "DELETE /api/documents/d1": inUse,
    });
    const user = userEvent.setup();
    renderList();
    const first = await openDialog(user);
    await user.click(
      within(first).getByRole("button", { name: "Eliminar documento" }),
    );
    await within(first).findByText(/Desvincúlalo/);
    await user.click(
      within(first).getByRole("button", { name: "Conservar documento" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );

    const second = await openDialog(user, "Carta Lemoncode");

    expect(within(second).queryByText(/Desvincúlalo/)).not.toBeInTheDocument();
  });
});
