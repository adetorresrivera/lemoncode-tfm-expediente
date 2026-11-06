import { describe, expect, it } from "vitest";
import { docxBytes, pdfBytes, zipBytes } from "../test/documents.js";
import {
  buildS3Key,
  contentDisposition,
  FILE_NAME_MAX,
  sanitizeFileName,
} from "./file-name.js";
import { detectDocument } from "./file-type.js";

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("detectDocument", () => {
  it("accepts a PDF whose name ends in .pdf in any case", () => {
    expect(detectDocument(pdfBytes(), "a.pdf")).toEqual({
      mimeType: PDF,
      ext: ".pdf",
    });
    expect(detectDocument(pdfBytes(), "CV.PDF")?.mimeType).toBe(PDF);
  });

  it("rejects PDF bytes under another extension, without one, or empty", () => {
    expect(detectDocument(pdfBytes(), "a.docx")).toBeNull();
    expect(detectDocument(pdfBytes(), "a.txt")).toBeNull();
    expect(detectDocument(pdfBytes(), "a")).toBeNull();
    expect(detectDocument(new Uint8Array(0), "a.pdf")).toBeNull();
  });

  it("accepts a DOCX, including one written in streaming mode", () => {
    expect(detectDocument(docxBytes(), "a.docx")).toEqual({
      mimeType: DOCX,
      ext: ".docx",
    });
    expect(detectDocument(docxBytes({ streamed: true }), "a.docx")?.ext).toBe(
      ".docx",
    );
    expect(detectDocument(docxBytes(), "A.DOCX")?.ext).toBe(".docx");
  });

  it("accepts a ZIP with other parts around word/document.xml and one with an end comment", () => {
    const parts = [
      "[Content_Types].xml",
      "docProps/app.xml",
      "word/document.xml",
    ];
    expect(detectDocument(zipBytes(parts), "a.docx")?.ext).toBe(".docx");
    expect(
      detectDocument(zipBytes(parts, { comment: "made by hand" }), "a.docx")
        ?.ext,
    ).toBe(".docx");
  });

  it("rejects a DOCX under the .pdf extension", () => {
    expect(detectDocument(docxBytes(), "a.pdf")).toBeNull();
  });

  it("rejects a ZIP without word/document.xml", () => {
    expect(
      detectDocument(zipBytes(["[Content_Types].xml"]), "a.docx"),
    ).toBeNull();
  });

  it("rejects an OOXML workbook renamed to .docx", () => {
    expect(
      detectDocument(
        zipBytes(["[Content_Types].xml", "xl/workbook.xml"]),
        "a.docx",
      ),
    ).toBeNull();
    expect(detectDocument(zipBytes(["xl/workbook.xml"]), "a.docx")).toBeNull();
  });

  it("rejects a ZIP whose content merely contains the text word/document.xml", () => {
    const bytes = zipBytes(["readme.txt"], {
      contents: { "readme.txt": "word/document.xml" },
    });
    expect(detectDocument(bytes, "a.docx")).toBeNull();
  });

  it("rejects a buffer that starts like a ZIP but has no end record", () => {
    const bytes = new Uint8Array(64);
    bytes.set([0x50, 0x4b, 0x03, 0x04]);
    expect(detectDocument(bytes, "a.docx")).toBeNull();
  });

  it("rejects a ZIP whose end record carries the 0xffff entry-count sentinel", () => {
    const bytes = docxBytes();
    // No archive comment, so the end record is the last 22 bytes; the entry count sits at +10.
    new DataView(bytes.buffer, bytes.byteOffset).setUint16(
      bytes.length - 22 + 10,
      0xffff,
      true,
    );
    expect(detectDocument(bytes, "a.docx")).toBeNull();
  });

  it("rejects a ZIP whose directory offset points outside the buffer", () => {
    const bytes = docxBytes();
    new DataView(bytes.buffer, bytes.byteOffset).setUint32(
      bytes.length - 22 + 16,
      bytes.length + 100,
      true,
    );
    expect(detectDocument(bytes, "a.docx")).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("keeps only the basename after / or \\", () => {
    expect(sanitizeFileName("C:\\Users\\ana\\CV.pdf")).toBe("CV.pdf");
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
  });

  it("removes control characters and trims", () => {
    expect(sanitizeFileName(" \tCV\u0007 Frontend.pdf\n")).toBe(
      "CV Frontend.pdf",
    );
  });

  it("answers null when nothing is left", () => {
    expect(sanitizeFileName("\u0000\u001f")).toBeNull();
    expect(sanitizeFileName("   ")).toBeNull();
    expect(sanitizeFileName("dir/")).toBeNull();
  });

  it("keeps accents and the original case", () => {
    expect(sanitizeFileName("CV Ñandú (v3).PDF")).toBe("CV Ñandú (v3).PDF");
  });

  it("cuts a long name to 255 units and keeps its extension", () => {
    const name = sanitizeFileName(`${"a".repeat(300)}.pdf`);
    expect(name).toHaveLength(FILE_NAME_MAX);
    expect(name?.endsWith(".pdf")).toBe(true);
  });

  it("never splits a surrogate pair at the cut", () => {
    const name = sanitizeFileName(`${"😀".repeat(254)}.pdf`);
    expect(name).not.toBeNull();
    expect(name!.length).toBeLessThanOrEqual(FILE_NAME_MAX);
    expect(() => encodeURIComponent(name!)).not.toThrow();
    expect(name!.endsWith(".pdf")).toBe(true);
  });
});

describe("buildS3Key", () => {
  it("slugs accents, case and punctuation", () => {
    expect(buildS3Key("ID", "CV Ñandú (v3).pdf", ".pdf")).toBe(
      "documents/ID/cv-nandu-v3.pdf",
    );
  });

  it("falls back to document when nothing survives", () => {
    expect(buildS3Key("ID", "..pdf", ".pdf")).toBe("documents/ID/document.pdf");
    expect(buildS3Key("ID", "日本.docx", ".docx")).toBe(
      "documents/ID/document.docx",
    );
    expect(buildS3Key("ID", ".pdf", ".pdf")).toBe("documents/ID/document.pdf");
  });

  it("collapses runs of dots and hyphens", () => {
    expect(buildS3Key("ID", "a..b...c.pdf", ".pdf")).toBe(
      "documents/ID/a.b.c.pdf",
    );
    expect(buildS3Key("ID", "a   b---c.pdf", ".pdf")).toBe(
      "documents/ID/a-b-c.pdf",
    );
  });

  it("is at most 100 characters including the extension", () => {
    const key = buildS3Key("ID", `${"x".repeat(300)}.pdf`, ".pdf");
    const name = key.slice("documents/ID/".length);
    expect(name).toHaveLength(100);
    expect(name.endsWith(".pdf")).toBe(true);
  });

  it("forces the extension of the detected type", () => {
    expect(buildS3Key("ID", "cv.txt", ".pdf").endsWith("cv.pdf")).toBe(true);
  });

  it("never yields a path escape or a character outside the slug set", () => {
    const names = [
      "../../x.pdf",
      "a/b\\c.pdf",
      "..pdf",
      "a..b.pdf",
      "-.-.pdf",
      "CV “x”.pdf",
      "😀.pdf",
      "a\u0007b.pdf",
      `${"-".repeat(120)}z.pdf`,
    ];
    for (const name of names) {
      const rest = buildS3Key("ID", name, ".pdf").slice("documents/ID/".length);
      expect(rest).not.toContain("..");
      expect(rest).not.toContain("/");
      expect(rest).toMatch(/^[a-z0-9._-]+$/);
      expect(rest).toMatch(/^[a-z0-9]/);
    }
  });
});

describe("contentDisposition", () => {
  it("gives an ASCII fallback and an RFC 5987 name", () => {
    expect(contentDisposition("CV Frontend Ñandú (v3).pdf")).toBe(
      `attachment; filename="CV Frontend Nandu (v3).pdf"; filename*=UTF-8''CV%20Frontend%20%C3%91and%C3%BA%20%28v3%29.pdf`,
    );
  });

  it.each(["CV “x”.pdf", "履歴書.pdf", 'a"b\\c%.pdf', "it's (1)*.pdf"])(
    "only holds printable ASCII and builds a valid header for %s",
    (name) => {
      const value = contentDisposition(name);
      expect(value).toMatch(/^[\x20-\x7e]+$/);
      expect(() => new Headers({ "content-disposition": value })).not.toThrow();
    },
  );
});
