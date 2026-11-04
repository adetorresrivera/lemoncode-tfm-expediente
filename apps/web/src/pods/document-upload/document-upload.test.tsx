import { documentSchema } from "@tfm/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { DocumentUploadContainer } from "./document-upload.container";

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

const pdf = (name = "CV Frontend.pdf") =>
  new File([new Uint8Array(1024)], name, { type: "application/pdf" });

const postCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Subir documento" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Subir documento",
  });
  return dialog;
};

describe("DocumentUploadContainer", () => {
  it("uploads a PDF as multipart, closes the dialog and announces it", async () => {
    const fetchMock = mockFetch({
      "POST /api/documents": () => jsonResponse(stored, 201),
    });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<DocumentUploadContainer onUploaded={onUploaded} />);

    const dialog = await openDialog(user);
    expect(
      within(dialog).getByText(
        "Sube un PDF o un DOCX. Se guarda en tu biblioteca de documentos.",
      ),
    ).toBeInTheDocument();
    const file = pdf();
    await user.upload(within(dialog).getByLabelText(/Archivo/), file);
    expect(within(dialog).getByLabelText(/Nombre/)).toHaveValue("CV Frontend");
    await user.type(within(dialog).getByLabelText(/Versión/), "v3");
    await user.click(
      within(dialog).getByRole("button", { name: "Subir documento" }),
    );

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
    expect(
      screen.getByRole("button", { name: "Subir documento" }),
    ).toHaveFocus();
  });
});
