import {
  documentListItemSchema,
  documentSchema,
  errorResponseSchema,
  type Document,
  type DocumentListItem,
} from "@tfm/contracts";
import type { Hono } from "hono";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "../app.js";
import {
  docxBytes,
  fakeStorage,
  pdfBytes,
  uploadForm,
} from "../test/documents.js";
import { useTestDb, type TestDb } from "../test/mongo.js";
import { contentDisposition } from "./file-name.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const UNKNOWN_ID = "0123456789abcdef01234567";

let testDb: TestDb;
let fake: ReturnType<typeof fakeStorage>;
let app: Hono;
let clock: Date;

beforeAll(async () => {
  testDb = await useTestDb();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  fake = fakeStorage();
  clock = new Date(Date.UTC(2026, 10, 3, 9, 0, 0));
  app = createApp({
    ...allUp,
    db: testDb.db,
    storage: fake.storage,
    now: () => clock,
  });
});

function tick(seconds = 60): void {
  clock = new Date(clock.getTime() + seconds * 1000);
}

async function upload(
  fields: { type: string; name: string; version: string },
  file: { bytes: Uint8Array; name: string },
): Promise<Document> {
  const res = await app.request("/api/documents", {
    method: "POST",
    body: uploadForm(fields, file),
  });
  expect(res.status).toBe(201);
  return documentSchema.parse(await res.json());
}

async function uploadPdf(
  type: "cv" | "carta",
  name: string,
  fileName = `${name}.pdf`,
): Promise<Document> {
  return upload(
    { type, name, version: "v1" },
    { bytes: pdfBytes(), name: fileName },
  );
}

async function insertApplication(
  links: Record<string, string | null>,
): Promise<void> {
  await testDb.db.collection("applications").insertOne({
    title: "Frontend",
    company: "Acme",
    ...links,
  });
}

async function expectError(
  res: Response,
  status: number,
  code: string,
  message?: string,
): Promise<void> {
  expect(res.status).toBe(status);
  const body = errorResponseSchema.parse(await res.json());
  expect(body.error.code).toBe(code);
  if (message !== undefined) expect(body.error.message).toBe(message);
}

describe("GET /api/documents", () => {
  it("answers an empty list when nothing is stored", async () => {
    const res = await app.request("/api/documents");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists the documents newest first and filters by type", async () => {
    const first = await uploadPdf("cv", "CV uno");
    tick();
    const letter = await uploadPdf("carta", "Carta dos");
    tick();
    const third = await uploadPdf("cv", "CV tres");

    const all = await app.request("/api/documents");
    expect(all.status).toBe(200);
    const items = (await all.json()) as unknown[];
    const parsed: DocumentListItem[] = items.map((item) =>
      documentListItemSchema.parse(item),
    );
    expect(parsed.map((d) => d.id)).toEqual([third.id, letter.id, first.id]);
    expect(parsed.every((d) => d.usedBy === 0)).toBe(true);

    const letters = await app.request("/api/documents?type=carta");
    expect(
      ((await letters.json()) as DocumentListItem[]).map((d) => d.id),
    ).toEqual([letter.id]);

    const cvs = await app.request("/api/documents?type=cv");
    expect(((await cvs.json()) as DocumentListItem[]).map((d) => d.id)).toEqual(
      [third.id, first.id],
    );
  });

  it.each(["?type=foto", "?type=", "?type=cv&type=carta"])(
    "answers 400 VALIDATION_ERROR for %s",
    async (query) => {
      await expectError(
        await app.request(`/api/documents${query}`),
        400,
        "VALIDATION_ERROR",
      );
    },
  );

  it("orders documents created at the same instant by the later one first, stably", async () => {
    const first = await uploadPdf("cv", "CV uno");
    // Ids carry a one-second timestamp plus a counter: wait is not needed, the counter orders them.
    const second = await uploadPdf("cv", "CV dos");

    const read = async () =>
      (
        (await (
          await app.request("/api/documents")
        ).json()) as DocumentListItem[]
      ).map((d) => d.id);
    expect(await read()).toEqual([second.id, first.id]);
    expect(await read()).toEqual([second.id, first.id]);
  });

  it("counts the applications that link each document as CV or cover letter", async () => {
    const a = await uploadPdf("cv", "CV A");
    tick();
    const b = await uploadPdf("carta", "Carta B");
    tick();
    const c = await uploadPdf("cv", "CV C");

    await insertApplication({ cvDocumentId: a.id });
    await insertApplication({
      cvDocumentId: a.id,
      coverLetterDocumentId: null,
    });
    await insertApplication({ coverLetterDocumentId: b.id });
    await insertApplication({
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
    await insertApplication({});

    const res = await app.request("/api/documents");
    const byId = new Map(
      ((await res.json()) as DocumentListItem[]).map((d) => [d.id, d.usedBy]),
    );
    expect(byId.get(a.id)).toBe(2);
    expect(byId.get(b.id)).toBe(1);
    expect(byId.get(c.id)).toBe(0);
  });
});

describe("GET /api/documents/:id", () => {
  it("answers the document without usedBy", async () => {
    const created = await uploadPdf("cv", "CV A");
    const res = await app.request(`/api/documents/${created.id}`);
    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(documentSchema.parse(body)).toEqual(created);
    expect(body).not.toHaveProperty("usedBy");
  });

  it.each([UNKNOWN_ID, "abc"])(
    "answers 404 «Documento no encontrado» for %s",
    async (id) => {
      await expectError(
        await app.request(`/api/documents/${id}`),
        404,
        "NOT_FOUND",
        "Documento no encontrado",
      );
    },
  );
});

describe("GET /api/documents/:id/download", () => {
  it("streams the stored bytes with the original name and nosniff", async () => {
    const bytes = pdfBytes(300);
    const created = await upload(
      { type: "cv", name: "CV", version: "v3" },
      { bytes, name: "CV Ñandú (v3).pdf" },
    );

    const res = await app.request(`/api/documents/${created.id}/download`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-length")).toBe(String(created.size));
    expect(res.headers.get("content-disposition")).toBe(
      contentDisposition("CV Ñandú (v3).pdf"),
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("serves a DOCX with its own mime type", async () => {
    const bytes = docxBytes();
    const created = await upload(
      { type: "carta", name: "Carta", version: "v1" },
      { bytes, name: "carta.docx" },
    );
    const res = await app.request(`/api/documents/${created.id}/download`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(DOCX);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it.each([UNKNOWN_ID, "abc"])(
    "answers 404 «Documento no encontrado» for %s",
    async (id) => {
      await expectError(
        await app.request(`/api/documents/${id}/download`),
        404,
        "NOT_FOUND",
        "Documento no encontrado",
      );
    },
  );

  it("answers 404 «Archivo no encontrado» when the object is gone from storage", async () => {
    const created = await uploadPdf("cv", "CV A");
    fake.objects.clear();
    await expectError(
      await app.request(`/api/documents/${created.id}/download`),
      404,
      "NOT_FOUND",
      "Archivo no encontrado",
    );
  });
});
