import type { DocumentListItem } from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import {
  countLabel,
  deleteErrorMessage,
  mapDocumentFromApiToVm,
  mapDocumentListFromApiToVm,
  usageLabel,
} from "./document-list.mapper";

const item = (overrides: Partial<DocumentListItem> = {}): DocumentListItem => ({
  id: "d1",
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "cv-frontend.pdf",
  s3Key: "documents/d1.pdf",
  mimeType: "application/pdf",
  size: 235520,
  createdAt: "2026-10-12T12:00:00.000Z",
  usedBy: 0,
  ...overrides,
});

describe("usageLabel", () => {
  it("is null when no application uses the document", () => {
    expect(usageLabel(0)).toBeNull();
  });

  it("uses the singular for one application", () => {
    expect(usageLabel(1)).toBe("En uso en 1 candidatura");
  });

  it("uses the plural for several applications", () => {
    expect(usageLabel(3)).toBe("En uso en 3 candidaturas");
  });
});

describe("countLabel", () => {
  it("is empty while the count is unknown", () => {
    expect(countLabel(null)).toBe("");
  });

  it("covers none, one and many", () => {
    expect(countLabel(0)).toBe("Sin documentos");
    expect(countLabel(1)).toBe("1 documento");
    expect(countLabel(4)).toBe("4 documentos");
  });
});

describe("deleteErrorMessage", () => {
  it("explains the refusal when the document is in use", () => {
    expect(deleteErrorMessage("DOCUMENT_IN_USE")).toBe(
      "Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.",
    );
  });

  it("uses the generic sentence for any other failure", () => {
    const generic = "No se pudo eliminar el documento. Inténtalo de nuevo.";
    expect(deleteErrorMessage("NETWORK_ERROR")).toBe(generic);
    expect(deleteErrorMessage("INVALID_RESPONSE")).toBe(generic);
  });
});

describe("mapDocumentFromApiToVm", () => {
  it("maps the row with labels, size, date and the download link", () => {
    expect(mapDocumentFromApiToVm(item({ usedBy: 2 }))).toEqual({
      id: "d1",
      name: "CV Frontend",
      version: "v3",
      type: "cv",
      typeLabel: "CV",
      createdAt: "2026-10-12T12:00:00.000Z",
      dateLabel: "12 oct. 2026",
      sizeLabel: "230 KB",
      usageLabel: "En uso en 2 candidaturas",
      downloadHref: "/api/documents/d1/download",
      downloadLabel: "Descargar CV Frontend",
      deleteLabel: "Eliminar CV Frontend",
    });
  });

  it("encodes the id in the download link and labels a cover letter", () => {
    const vm = mapDocumentFromApiToVm(item({ id: "a/b c", type: "carta" }));
    expect(vm.downloadHref).toBe("/api/documents/a%2Fb%20c/download");
    expect(vm.typeLabel).toBe("Carta");
    expect(vm.usageLabel).toBeNull();
  });
});

describe("mapDocumentListFromApiToVm", () => {
  it("maps every document and keeps the order", () => {
    const rows = mapDocumentListFromApiToVm([
      item({ id: "d1" }),
      item({ id: "d2" }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["d1", "d2"]);
  });
});
