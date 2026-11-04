import { documentSchema } from "@tfm/contracts";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@/core/http/http-client";
import { jsonResponse, mockFetch, type MockHandler } from "@/test/mock-fetch";
import { DocumentUploadContainer } from "./document-upload.container";
import {
  hasAllowedExtension,
  mapUploadErrorToFeedback,
  nameFromFileName,
} from "./document-upload.mapper";

const stored = documentSchema.parse({
  id: "d1",
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "CV Frontend.pdf",
  s3Key: "documents/d1/cv-frontend.pdf",
  mimeType: "application/pdf",
  size: 1024,
  createdAt: "2026-11-04T10:00:00.000Z",
});

const NETWORK =
  "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
const GENERIC = "No se pudo subir el documento. Inténtalo de nuevo.";
const TOO_LARGE = "El archivo supera 5 MB.";
const UNSUPPORTED = "Solo se admiten archivos PDF o DOCX.";

const pdf = (name = "CV Frontend.pdf") =>
  new File([new Uint8Array(1024)], name, { type: "application/pdf" });

const postCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const errorResponse = (code: string, status: number, details?: unknown) =>
  jsonResponse({ error: { code, message: "server text", details } }, status);

// The extension rows upload files the input's `accept` would drop.
const setup = () => userEvent.setup({ applyAccept: false });
type User = ReturnType<typeof setup>;

const opener = () => screen.getByRole("button", { name: "Subir documento" });

const openDialog = async (user: User) => {
  await user.click(opener());
  return screen.findByRole("dialog", { name: "Subir documento" });
};

const fileInput = (dialog: HTMLElement) =>
  within(dialog).getByLabelText(/Archivo/);
const nameInput = (dialog: HTMLElement) =>
  within(dialog).getByLabelText(/Nombre/);
const versionInput = (dialog: HTMLElement) =>
  within(dialog).getByLabelText(/Versión/);
const submit = (dialog: HTMLElement, name = "Subir documento") =>
  within(dialog).getByRole("button", { name });

const fillValid = async (user: User, dialog: HTMLElement, file = pdf()) => {
  await user.upload(fileInput(dialog), file);
  await user.type(versionInput(dialog), "v3");
};

// A request that stays pending until the test resolves it or aborts it.
const pendingUpload = () => {
  const state: { signal: AbortSignal | null; resolve: () => void } = {
    signal: null,
    resolve: () => undefined,
  };
  const handler: MockHandler = (_url, init) =>
    new Promise<Response>((resolve, reject) => {
      state.signal = init?.signal ?? null;
      state.resolve = () => resolve(jsonResponse(stored, 201));
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("The operation was aborted.", "AbortError")),
      );
    });
  return { state, handler };
};

describe("upload mapper", () => {
  it("drops the last extension and trims", () => {
    expect(nameFromFileName("CV Frontend.pdf")).toBe("CV Frontend");
    expect(nameFromFileName("  informe.final.DOCX ")).toBe("informe.final");
  });

  it("does not drop what is not an extension", () => {
    expect(nameFromFileName("sin extension")).toBe("sin extension");
  });

  it("accepts .pdf and .docx in any case and nothing else", () => {
    expect(hasAllowedExtension("a.PDF")).toBe(true);
    expect(hasAllowedExtension("a.docx")).toBe(true);
    expect(hasAllowedExtension("a.doc")).toBe(false);
    expect(hasAllowedExtension("pdf")).toBe(false);
  });

  it("maps every failure to fixed copy and never to the server text", () => {
    const http = (status: number, code: HttpError["code"], details?: unknown) =>
      new HttpError(status, code, "server text", details);
    expect(mapUploadErrorToFeedback(http(413, "FILE_TOO_LARGE"))).toStrictEqual(
      { fields: { file: TOO_LARGE } },
    );
    expect(
      mapUploadErrorToFeedback(http(415, "UNSUPPORTED_FILE_TYPE")),
    ).toStrictEqual({ fields: { file: UNSUPPORTED } });
    expect(
      mapUploadErrorToFeedback(
        http(400, "VALIDATION_ERROR", { fieldErrors: { name: ["x"] } }),
      ),
    ).toStrictEqual({ fields: { name: "Revisa este campo." } });
    expect(
      mapUploadErrorToFeedback(http(400, "VALIDATION_ERROR", "garbage")),
    ).toStrictEqual({ message: GENERIC });
    expect(mapUploadErrorToFeedback(http(0, "NETWORK_ERROR"))).toStrictEqual({
      message: NETWORK,
    });
    expect(mapUploadErrorToFeedback(http(500, "INTERNAL_ERROR"))).toStrictEqual(
      { message: GENERIC },
    );
  });
});

describe("DocumentUploadContainer", () => {
  it("uploads a PDF as multipart, closes the dialog and announces it", async () => {
    const fetchMock = mockFetch({
      "POST /api/documents": () => jsonResponse(stored, 201),
    });
    const onUploaded = vi.fn();
    const user = setup();
    render(<DocumentUploadContainer onUploaded={onUploaded} />);

    const dialog = await openDialog(user);
    expect(
      within(dialog).getByText(
        "Sube un PDF o un DOCX. Se guarda en tu biblioteca de documentos.",
      ),
    ).toBeInTheDocument();
    const file = pdf();
    await user.upload(fileInput(dialog), file);
    expect(nameInput(dialog)).toHaveValue("CV Frontend");
    await user.type(versionInput(dialog), "v3");
    await user.click(submit(dialog));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(onUploaded).toHaveBeenCalledWith({ id: "d1", type: "cv" });
    const calls = postCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const init = calls[0]?.[1];
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("type")).toBe("cv");
    expect(body.get("name")).toBe("CV Frontend");
    expect(body.get("version")).toBe("v3");
    expect(body.get("file")).toBe(file);
    expect(new Headers(init?.headers).has("content-type")).toBe(false);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Documento subido.")).toBeInTheDocument();
    expect(opener()).toHaveFocus();
  });

  it("sends the chosen type", async () => {
    const fetchMock = mockFetch({
      "POST /api/documents": () => jsonResponse(stored, 201),
    });
    const user = setup();
    render(<DocumentUploadContainer />);
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("radio", { name: "Carta" }));
    await fillValid(user, dialog);
    await user.click(submit(dialog));

    await waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1));
    const body = postCalls(fetchMock)[0]?.[1]?.body as FormData;
    expect(body.get("type")).toBe("carta");
  });

  describe("client validation", () => {
    it("asks for a file, flags the empty fields and focuses the file input", async () => {
      const fetchMock = mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await user.click(submit(dialog));

      expect(
        await within(dialog).findByText("Elige un archivo PDF o DOCX."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText("Escribe un nombre."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText("Escribe la versión."),
      ).toBeInTheDocument();
      await waitFor(() => expect(fileInput(dialog)).toHaveFocus());
      expect(fileInput(dialog)).toHaveAttribute("aria-invalid", "true");
      expect(postCalls(fetchMock)).toHaveLength(0);
    });

    it("refuses a file that is not a PDF or a DOCX", async () => {
      const fetchMock = mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await fillValid(user, dialog, pdf("notas.txt"));
      await user.click(submit(dialog));

      expect(await within(dialog).findByText(UNSUPPORTED)).toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(0);
    });

    it("refuses a file over 5 MB", async () => {
      const fetchMock = mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await fillValid(
        user,
        dialog,
        new File([new Uint8Array(6 * 1024 * 1024)], "big.pdf"),
      );
      await user.click(submit(dialog));

      expect(await within(dialog).findByText(TOO_LARGE)).toBeInTheDocument();
      expect(postCalls(fetchMock)).toHaveLength(0);
    });

    it("flags an empty name and version and focuses the first one", async () => {
      const fetchMock = mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await user.upload(fileInput(dialog), pdf());
      await user.clear(nameInput(dialog));
      await user.click(submit(dialog));

      expect(
        await within(dialog).findByText("Escribe un nombre."),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText("Escribe la versión."),
      ).toBeInTheDocument();
      await waitFor(() => expect(nameInput(dialog)).toHaveFocus());
      expect(postCalls(fetchMock)).toHaveLength(0);
    });

    it("clears an error as soon as the field is fixed", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await user.click(submit(dialog));
      await within(dialog).findByText("Escribe la versión.");
      // The focus move of the failed submit lands one frame later; typing before it would race.
      await waitFor(() => expect(fileInput(dialog)).toHaveFocus());

      await user.type(versionInput(dialog), "v3");

      await waitFor(() =>
        expect(
          within(dialog).queryByText("Escribe la versión."),
        ).not.toBeInTheDocument(),
      );
    });
  });

  describe("server and network failures", () => {
    it.each([
      [413, "FILE_TOO_LARGE", TOO_LARGE],
      [415, "UNSUPPORTED_FILE_TYPE", UNSUPPORTED],
    ] as const)(
      "shows the %i under Archivo, focuses it and keeps the values",
      async (status, code, message) => {
        const fetchMock = mockFetch({
          "POST /api/documents": () => errorResponse(code, status),
        });
        const user = setup();
        render(<DocumentUploadContainer />);
        const dialog = await openDialog(user);
        await fillValid(user, dialog);

        await user.click(submit(dialog));

        expect(await within(dialog).findByText(message)).toBeInTheDocument();
        expect(within(dialog).queryByText("server text")).toBeNull();
        await waitFor(() => expect(fileInput(dialog)).toHaveFocus());
        expect(nameInput(dialog)).toHaveValue("CV Frontend");
        expect(versionInput(dialog)).toHaveValue("v3");
        expect(postCalls(fetchMock)).toHaveLength(1);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      },
    );

    it("maps a 400 on the name to «Revisa este campo.» under Nombre", async () => {
      mockFetch({
        "POST /api/documents": () =>
          errorResponse("VALIDATION_ERROR", 400, {
            fieldErrors: { name: ["too_small"] },
          }),
      });
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await fillValid(user, dialog);

      await user.click(submit(dialog));

      expect(
        await within(dialog).findByText("Revisa este campo."),
      ).toBeInTheDocument();
      expect(nameInput(dialog)).toHaveAttribute("aria-invalid", "true");
      await waitFor(() => expect(nameInput(dialog)).toHaveFocus());
    });

    it("shows the network sentence in the dialog region", async () => {
      mockFetch({
        "POST /api/documents": () => {
          throw new TypeError("Failed to fetch");
        },
      });
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await fillValid(user, dialog);

      await user.click(submit(dialog));

      expect(await within(dialog).findByText(NETWORK)).toBeInTheDocument();
      expect(nameInput(dialog)).toHaveValue("CV Frontend");
    });

    it("shows the generic sentence for any other failure and clears it on the next submit", async () => {
      const pending = pendingUpload();
      let calls = 0;
      const handler: MockHandler = (url, init) => {
        calls += 1;
        return calls === 1
          ? errorResponse("INTERNAL_ERROR", 500)
          : pending.handler(url, init);
      };
      mockFetch({ "POST /api/documents": handler });
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await fillValid(user, dialog);

      await user.click(submit(dialog));
      expect(await within(dialog).findByText(GENERIC)).toBeInTheDocument();
      expect(within(dialog).queryByText("server text")).toBeNull();

      await user.click(submit(dialog));
      await waitFor(() =>
        expect(within(dialog).queryByText(GENERIC)).not.toBeInTheDocument(),
      );
      expect(
        within(dialog).getByText("Subiendo el archivo…"),
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: "Cancelar subida" }),
      );
    });
  });

  describe("while uploading", () => {
    const startUpload = async () => {
      const pending = pendingUpload();
      const fetchMock = mockFetch({ "POST /api/documents": pending.handler });
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await fillValid(user, dialog);
      await user.click(submit(dialog));
      await within(dialog).findByText("Subiendo el archivo…");
      return { user, dialog, fetchMock, pending };
    };

    it("disables the submit, moves focus to «Cancelar subida» and announces it", async () => {
      const { dialog } = await startUpload();

      expect(submit(dialog, "Subiendo…")).toBeDisabled();
      const cancel = within(dialog).getByRole("button", {
        name: "Cancelar subida",
      });
      await waitFor(() => expect(cancel).toHaveFocus());
    });

    it("sends nothing on a second submit from a field", async () => {
      const { user, dialog, fetchMock } = await startUpload();

      await user.click(versionInput(dialog));
      await user.keyboard("{Enter}");

      expect(postCalls(fetchMock)).toHaveLength(1);
    });

    it("stays open on the X, Escape and a pointer-down outside", async () => {
      const { user, dialog } = await startUpload();

      await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.pointerDown(
        document.querySelector('[data-slot="dialog-overlay"]') as Element,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("aborts on «Cancelar subida», keeps the dialog and every value", async () => {
      const { user, dialog, pending } = await startUpload();

      await user.click(
        within(dialog).getByRole("button", { name: "Cancelar subida" }),
      );

      expect(pending.state.signal?.aborted).toBe(true);
      expect(
        await within(dialog).findByText("Subida cancelada."),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(nameInput(dialog)).toHaveValue("CV Frontend");
      expect(versionInput(dialog)).toHaveValue("v3");
      expect(submit(dialog)).toBeEnabled();
      expect(screen.queryByText("Documento subido.")).toBeNull();
    });

    it("does not announce the upload before the server answered", async () => {
      const { dialog, pending } = await startUpload();

      expect(screen.queryByText("Documento subido.")).toBeNull();
      await act(async () => pending.state.resolve());
      expect(await screen.findByText("Documento subido.")).toBeInTheDocument();
      expect(dialog).not.toBeInTheDocument();
    });
  });

  describe("name prefill", () => {
    it("replaces an automatic prefill and never a typed name", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await user.upload(fileInput(dialog), pdf("uno.pdf"));
      await user.upload(fileInput(dialog), pdf("dos.pdf"));
      expect(nameInput(dialog)).toHaveValue("dos");

      await user.clear(nameInput(dialog));
      await user.type(nameInput(dialog), "Mi CV");
      await user.upload(fileInput(dialog), pdf("tres.pdf"));
      expect(nameInput(dialog)).toHaveValue("Mi CV");
    });

    it("cuts the prefill to 120 characters", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      await user.upload(fileInput(dialog), pdf(`${"a".repeat(200)}.pdf`));

      expect(nameInput(dialog)).toHaveValue("a".repeat(120));
    });

    it("starts every opening empty", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const first = await openDialog(user);
      await fillValid(user, first);
      await user.click(within(first).getByRole("radio", { name: "Carta" }));
      await user.click(submit(first, "Descartar subida"));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );

      const second = await openDialog(user);

      expect(nameInput(second)).toHaveValue("");
      expect(versionInput(second)).toHaveValue("");
      expect((fileInput(second) as HTMLInputElement).files).toHaveLength(0);
      expect(within(second).getByRole("radio", { name: "CV" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });

  describe("type", () => {
    it("opens with the initial type selected and never leaves the group empty", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer initialType="carta" />);
      const dialog = await openDialog(user);
      const carta = within(dialog).getByRole("radio", { name: "Carta" });
      expect(carta).toHaveAttribute("aria-checked", "true");

      await user.click(carta);

      expect(carta).toHaveAttribute("aria-checked", "true");
    });

    it("defaults to CV", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      expect(within(dialog).getByRole("radio", { name: "CV" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });

  describe("focus", () => {
    it("is on the opener after «Descartar subida», the X and Escape", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);

      const first = await openDialog(user);
      await user.click(submit(first, "Descartar subida"));
      await waitFor(() => expect(opener()).toHaveFocus());

      const second = await openDialog(user);
      await user.click(within(second).getByRole("button", { name: "Cerrar" }));
      await waitFor(() => expect(opener()).toHaveFocus());

      await openDialog(user);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(opener()).toHaveFocus());
    });

    it("keeps the X as the last button of the dialog", async () => {
      mockFetch({});
      const user = setup();
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);

      const buttons = within(dialog).getAllByRole("button");

      expect(buttons.at(-1)).toHaveAccessibleName("Cerrar");
    });
  });

  it("clears the success line 5 s after the upload", async () => {
    mockFetch({ "POST /api/documents": () => jsonResponse(stored, 201) });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({
        applyAccept: false,
        advanceTimers: vi.advanceTimersByTime,
      });
      render(<DocumentUploadContainer />);
      const dialog = await openDialog(user);
      await fillValid(user, dialog);
      await user.click(submit(dialog));
      expect(await screen.findByText("Documento subido.")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(4900);
      });
      expect(screen.getByText("Documento subido.")).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.queryByText("Documento subido.")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
