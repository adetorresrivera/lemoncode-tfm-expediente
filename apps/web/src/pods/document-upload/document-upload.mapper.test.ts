import {
  DOCUMENT_MAX_BYTES,
  type Document,
  type DocumentListItem,
} from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import { HttpError } from "@/core/http/http-client";
import {
  documentLabel,
  hasAllowedExtension,
  mapDocumentsToOptionsVm,
  mapUploadedDocumentFromApiToVm,
  mapUploadErrorToFeedback,
  mapUploadFormToRequest,
  nameFromFileName,
  newUploadFormValues,
  NETWORK_MESSAGE,
  NO_FILE_MESSAGE,
  UPLOAD_ERROR_MESSAGE,
  validateUploadForm,
} from "./document-upload.mapper";
import type { UploadFormValues } from "./document-upload.vm";

const pdf = (name = "cv.pdf", size = 1024): File => {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const values = (
  overrides: Partial<UploadFormValues> = {},
): UploadFormValues => ({
  type: "cv",
  file: pdf(),
  name: "CV Frontend",
  version: "v3",
  ...overrides,
});

const listItem = (
  overrides: Partial<DocumentListItem> = {},
): DocumentListItem => ({
  id: "d1",
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "cv-frontend.pdf",
  s3Key: "documents/d1.pdf",
  mimeType: "application/pdf",
  size: 1024,
  createdAt: "2026-10-12T12:00:00.000Z",
  usedBy: 0,
  ...overrides,
});

describe("fixed messages", () => {
  it("keeps the Spanish copy of the dialog", () => {
    expect(NO_FILE_MESSAGE).toBe("Elige un archivo PDF o DOCX.");
    expect(NETWORK_MESSAGE).toBe(
      "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
    );
    expect(UPLOAD_ERROR_MESSAGE).toBe(
      "No se pudo subir el documento. Inténtalo de nuevo.",
    );
  });
});

describe("newUploadFormValues", () => {
  it("starts with the given type, no file and empty text fields", () => {
    expect(newUploadFormValues("carta")).toEqual({
      type: "carta",
      file: null,
      name: "",
      version: "",
    });
  });
});

describe("nameFromFileName", () => {
  it("drops the last extension and surrounding spaces", () => {
    expect(nameFromFileName("  CV Frontend.pdf ")).toBe("CV Frontend");
    expect(nameFromFileName("cv.final.docx")).toBe("cv.final");
  });

  it("keeps a name without extension", () => {
    expect(nameFromFileName("curriculum")).toBe("curriculum");
  });

  it("cuts the name to 120 characters", () => {
    expect(nameFromFileName(`${"a".repeat(130)}.pdf`)).toBe("a".repeat(120));
  });
});

describe("hasAllowedExtension", () => {
  it("accepts pdf and docx in any case", () => {
    expect(hasAllowedExtension("cv.pdf")).toBe(true);
    expect(hasAllowedExtension("CV.DOCX")).toBe(true);
  });

  it("rejects other extensions", () => {
    expect(hasAllowedExtension("cv.exe")).toBe(false);
    expect(hasAllowedExtension("cv.doc")).toBe(false);
    expect(hasAllowedExtension("cv")).toBe(false);
  });
});

describe("validateUploadForm", () => {
  it("returns undefined for a valid form", () => {
    expect(validateUploadForm(values())).toBeUndefined();
  });

  it("asks for a file when there is none", () => {
    expect(validateUploadForm(values({ file: null }))).toEqual({
      fields: { file: "Elige un archivo PDF o DOCX." },
    });
  });

  it("rejects an unsupported extension", () => {
    expect(validateUploadForm(values({ file: pdf("cv.exe") }))).toEqual({
      fields: { file: "Solo se admiten archivos PDF o DOCX." },
    });
  });

  it("rejects a file over 5 MB", () => {
    expect(
      validateUploadForm(
        values({ file: pdf("cv.pdf", DOCUMENT_MAX_BYTES + 1) }),
      ),
    ).toEqual({ fields: { file: "El archivo supera 5 MB." } });
  });

  it("asks for a name and a version when they are blank", () => {
    expect(validateUploadForm(values({ name: "  ", version: "" }))).toEqual({
      fields: {
        name: "Escribe un nombre.",
        version: "Escribe la versión.",
      },
    });
  });

  it("reports names and versions that are too long", () => {
    expect(
      validateUploadForm(
        values({ name: "n".repeat(121), version: "v".repeat(41) }),
      ),
    ).toEqual({
      fields: {
        name: "El nombre admite hasta 120 caracteres.",
        version: "La versión admite hasta 40 caracteres.",
      },
    });
  });
});

describe("mapUploadFormToRequest", () => {
  it("is null without a file", () => {
    expect(mapUploadFormToRequest(values({ file: null }))).toBeNull();
  });

  it("trims name and version and carries the file", () => {
    const file = pdf();
    expect(
      mapUploadFormToRequest(
        values({ file, name: " CV Frontend ", version: " v3 " }),
      ),
    ).toEqual({ type: "cv", name: "CV Frontend", version: "v3", file });
  });
});

describe("mapUploadErrorToFeedback", () => {
  it("maps a too large file to the file field", () => {
    expect(
      mapUploadErrorToFeedback(new HttpError(413, "FILE_TOO_LARGE", "x")),
    ).toEqual({ fields: { file: "El archivo supera 5 MB." } });
  });

  it("maps an unsupported type to the file field", () => {
    expect(
      mapUploadErrorToFeedback(
        new HttpError(415, "UNSUPPORTED_FILE_TYPE", "x"),
      ),
    ).toEqual({ fields: { file: "Solo se admiten archivos PDF o DOCX." } });
  });

  it("maps a network failure to the connection message", () => {
    expect(
      mapUploadErrorToFeedback(new HttpError(0, "NETWORK_ERROR", "x")),
    ).toEqual({ message: NETWORK_MESSAGE });
  });

  it("uses only the field names of a 400 and never the server text", () => {
    expect(
      mapUploadErrorToFeedback(
        new HttpError(400, "VALIDATION_ERROR", "server text", {
          fieldErrors: { name: ["server detail"], extra: ["ignored"] },
        }),
      ),
    ).toEqual({ fields: { name: "Revisa este campo." } });
  });

  it("falls back to the generic message for an unknown 400 or a foreign error", () => {
    expect(
      mapUploadErrorToFeedback(
        new HttpError(400, "VALIDATION_ERROR", "x", { fieldErrors: {} }),
      ),
    ).toEqual({ message: UPLOAD_ERROR_MESSAGE });
    expect(mapUploadErrorToFeedback(new Error("boom"))).toEqual({
      message: UPLOAD_ERROR_MESSAGE,
    });
  });
});

describe("documentLabel", () => {
  it("joins name, version and upload date", () => {
    expect(
      documentLabel({
        name: "CV Frontend",
        version: "v3",
        createdAt: "2026-10-12T12:00:00.000Z",
      }),
    ).toBe("CV Frontend · v3 · 12 oct. 2026");
  });
});

describe("mapUploadedDocumentFromApiToVm", () => {
  it("maps id, type and the picker label", () => {
    const document: Document = {
      id: "d1",
      type: "carta",
      name: "CV Frontend",
      version: "v3",
      fileName: "cv-frontend.pdf",
      s3Key: "documents/d1.pdf",
      mimeType: "application/pdf",
      size: 1024,
      createdAt: "2026-10-12T12:00:00.000Z",
    };
    expect(mapUploadedDocumentFromApiToVm(document)).toEqual({
      id: "d1",
      type: "carta",
      label: "CV Frontend · v3 · 12 oct. 2026",
    });
  });
});

describe("mapDocumentsToOptionsVm", () => {
  it("keeps the order the API answers", () => {
    expect(
      mapDocumentsToOptionsVm([
        listItem({ id: "d2", name: "Nuevo" }),
        listItem({ id: "d1", name: "Antiguo" }),
      ]),
    ).toEqual([
      { id: "d2", label: "Nuevo · v3 · 12 oct. 2026" },
      { id: "d1", label: "Antiguo · v3 · 12 oct. 2026" },
    ]);
  });
});
