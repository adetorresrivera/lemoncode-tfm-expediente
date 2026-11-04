import { serve } from "@hono/node-server";
import {
  documentSchema,
  errorResponseSchema,
  type Document,
} from "@tfm/contracts";
import type { Hono } from "hono";
import { ObjectId } from "mongodb";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp, type AppDeps } from "../app.js";
import type { DocumentStorage } from "../storage/s3.js";
import {
  TEST_BUCKET,
  docxBytes,
  fakeStorage,
  pdfBytes,
  readStream,
  uploadForm,
  useTestStorage,
  zipBytes,
  type FakeObject,
  type TestStorage,
} from "../test/documents.js";
import { useTestDb, type TestDb } from "../test/mongo.js";
import {
  createDocumentsService,
  type UploadedFile,
} from "./documents.service.js";
import type { DocumentsRepository } from "./documents.repository.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const CLOCK = new Date(Date.UTC(2026, 10, 3, 9, 30));
const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FIELDS = { type: "cv", name: "CV Frontend", version: "v3" };
const MB = 1024 * 1024;

let testDb: TestDb;
let testStorage: TestStorage;
let fake: ReturnType<typeof fakeStorage>;
let app: Hono;

beforeAll(async () => {
  testDb = await useTestDb();
  testStorage = await useTestStorage();
});

afterAll(async () => {
  await testStorage.cleanup();
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  fake = fakeStorage();
  app = createApp({
    ...allUp,
    db: testDb.db,
    storage: fake.storage,
    now: () => CLOCK,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function upload(form: FormData | string, headers?: Record<string, string>) {
  return app.request("/api/documents", { method: "POST", body: form, headers });
}

function pdfUpload(overrides: Parameters<typeof uploadForm>[0] = {}) {
  return upload(
    uploadForm(
      { ...FIELDS, ...overrides },
      { bytes: pdfBytes(), name: "cv.pdf", type: PDF },
    ),
  );
}

async function expectNothingStored(): Promise<void> {
  expect(await testDb.db.collection("documents").countDocuments()).toBe(0);
  expect(fake.objects.size).toBe(0);
}

async function expectError(
  res: Response,
  status: number,
  code: string,
): Promise<{ details?: unknown }> {
  expect(res.status).toBe(status);
  const body = errorResponseSchema.parse(await res.json());
  expect(body.error.code).toBe(code);
  return body.error;
}

describe("POST /api/documents (tracer: real Silo test bucket and real Mongo)", () => {
  it("stores a PDF in the bucket under the slugged key and its metadata in Mongo", async () => {
    expect(TEST_BUCKET).toBe("tfm-assets-test");
    const realApp = createApp({
      ...allUp,
      db: testDb.db,
      storage: testStorage.storage,
      now: () => CLOCK,
    });
    const bytes = pdfBytes(2048);

    const res = await realApp.request("/api/documents", {
      method: "POST",
      body: uploadForm(FIELDS, {
        bytes,
        name: "CV Ñandú (v3).pdf",
        type: PDF,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const doc = documentSchema.parse(body);
    expect(doc.id).toMatch(/^[0-9a-f]{24}$/);
    expect(doc).toEqual({
      id: doc.id,
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "CV Ñandú (v3).pdf",
      s3Key: `documents/${doc.id}/cv-nandu-v3.pdf`,
      mimeType: PDF,
      size: 2048,
      createdAt: CLOCK.toISOString(),
    });
    expect(body).not.toHaveProperty("_id");

    const stored = await testDb.db
      .collection("documents")
      .findOne({ _id: new ObjectId(doc.id) });
    expect(stored).toMatchObject({
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "CV Ñandú (v3).pdf",
      s3Key: doc.s3Key,
      mimeType: PDF,
      size: 2048,
      createdAt: CLOCK,
    });

    const object = await testStorage.storage.get(doc.s3Key);
    expect(object).not.toBeNull();
    expect(await readStream(object!.stream)).toEqual(bytes);
  });
});

describe("POST /api/documents accepted files", () => {
  it("stores a streamed DOCX with the DOCX type and a .docx key", async () => {
    const res = await upload(
      uploadForm(
        { ...FIELDS, type: "carta", name: "Carta" },
        {
          bytes: docxBytes({ streamed: true }),
          name: "Carta.docx",
          type: DOCX,
        },
      ),
    );

    expect(res.status).toBe(201);
    const doc = documentSchema.parse(await res.json());
    expect(doc.type).toBe("carta");
    expect(doc.mimeType).toBe(DOCX);
    expect(doc.s3Key.endsWith("/carta.docx")).toBe(true);
    expect(fake.objects.get(doc.s3Key)?.contentType).toBe(DOCX);
  });

  it("stores the detected type, not the one the browser sent", async () => {
    const res = await upload(
      uploadForm(FIELDS, {
        bytes: pdfBytes(),
        name: "a.pdf",
        type: "text/html",
      }),
    );

    expect(res.status).toBe(201);
    const doc = documentSchema.parse(await res.json());
    expect(doc.mimeType).toBe(PDF);
    expect(fake.objects.get(doc.s3Key)?.contentType).toBe(PDF);
  });

  it("accepts an upper-case extension", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(), name: "CV.PDF" }),
    );
    expect(res.status).toBe(201);
    expect(documentSchema.parse(await res.json()).fileName).toBe("CV.PDF");
  });

  it("keeps the sanitized basename as fileName", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(), name: "C:\\docs\\ana\\cv.pdf" }),
    );
    expect(res.status).toBe(201);
    expect(documentSchema.parse(await res.json()).fileName).toBe("cv.pdf");
  });

  it("ignores client parts other than file, type, name and version", async () => {
    const form = uploadForm(FIELDS, {
      bytes: pdfBytes(300),
      name: "real.pdf",
      type: PDF,
    });
    const fakeId = new ObjectId().toHexString();
    form.append("id", fakeId);
    form.append("s3Key", "documents/evil/key.pdf");
    form.append("mimeType", "text/html");
    form.append("size", "1");
    form.append("createdAt", "2001-01-01T00:00:00.000Z");
    form.append("fileName", "other.pdf");

    const res = await upload(form);

    expect(res.status).toBe(201);
    const doc = documentSchema.parse(await res.json());
    expect(doc.id).not.toBe(fakeId);
    expect(doc.s3Key).toBe(`documents/${doc.id}/real.pdf`);
    expect(doc.mimeType).toBe(PDF);
    expect(doc.size).toBe(300);
    expect(doc.fileName).toBe("real.pdf");
    expect(doc.createdAt).toBe(CLOCK.toISOString());
    const stored = await testDb.db.collection("documents").findOne({});
    expect(Object.keys(stored ?? {}).sort()).toEqual(
      [
        "_id",
        "createdAt",
        "fileName",
        "mimeType",
        "name",
        "s3Key",
        "size",
        "type",
        "version",
      ].sort(),
    );
  });

  it("gives two concurrent identical uploads two ids, two keys and two objects", async () => {
    const send = () =>
      upload(
        uploadForm(FIELDS, { bytes: pdfBytes(), name: "same.pdf", type: PDF }),
      );

    const [first, second] = await Promise.all([send(), send()]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const a: Document = documentSchema.parse(await first.json());
    const b: Document = documentSchema.parse(await second.json());
    expect(a.id).not.toBe(b.id);
    expect(a.s3Key).not.toBe(b.s3Key);
    expect(fake.objects.size).toBe(2);
    expect(await testDb.db.collection("documents").countDocuments()).toBe(2);
  });
});

describe("POST /api/documents unsupported files (415)", () => {
  const rows: [string, Uint8Array, string][] = [
    ["a PDF renamed to .docx", pdfBytes(), "a.docx"],
    ["a DOCX renamed to .pdf", docxBytes(), "a.pdf"],
    ["a text file", new TextEncoder().encode("hola"), "a.txt"],
    ["a plain zip without the entry", zipBytes(["readme.txt"]), "a.docx"],
    [
      "an OOXML workbook renamed to .docx",
      zipBytes(["[Content_Types].xml", "xl/workbook.xml"]),
      "a.docx",
    ],
    [
      "a zip whose content only mentions word/document.xml",
      zipBytes(["readme.txt"], {
        contents: { "readme.txt": "word/document.xml" },
      }),
      "a.docx",
    ],
    ["an empty .pdf", new Uint8Array(0), "a.pdf"],
  ];

  it.each(rows)(
    "answers 415 and stores nothing for %s",
    async (_label, bytes, name) => {
      const res = await upload(uploadForm(FIELDS, { bytes, name }));
      await expectError(res, 415, "UNSUPPORTED_FILE_TYPE");
      await expectNothingStored();
    },
  );
});

describe("POST /api/documents size (413)", () => {
  it("stores a PDF of exactly 5 MiB", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(5 * MB), name: "big.pdf" }),
    );
    expect(res.status).toBe(201);
    expect(documentSchema.parse(await res.json()).size).toBe(5242880);
  });

  it("answers 413 for a PDF one byte over 5 MiB", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(5242881), name: "big.pdf" }),
    );
    await expectError(res, 413, "FILE_TOO_LARGE");
    await expectNothingStored();
  });

  it("answers 413 as JSON for a 6 MB body read in chunks (app.request has no Content-Length)", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(6 * MB), name: "big.pdf" }),
    );
    await expectError(res, 413, "FILE_TOO_LARGE");
    await expectNothingStored();
  });

  it("answers 413 as JSON for a 6 MB body over a real socket (Content-Length path)", async () => {
    let server: ReturnType<typeof serve> | undefined;
    const port = await new Promise<number>((resolve) => {
      server = serve({ fetch: app.fetch, port: 0 }, (info) =>
        resolve(info.port),
      );
    });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/documents`, {
        method: "POST",
        body: uploadForm(FIELDS, {
          bytes: pdfBytes(6 * MB),
          name: "big.pdf",
        }),
      });
      await expectError(res, 413, "FILE_TOO_LARGE");
    } finally {
      await new Promise<void>((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
        if ("closeAllConnections" in server) server.closeAllConnections();
      });
    }
    await expectNothingStored();
  });
});

describe("POST /api/documents validation (400)", () => {
  it("names the file when the part is missing", async () => {
    const res = await upload(uploadForm(FIELDS));
    const error = await expectError(res, 400, "VALIDATION_ERROR");
    expect(error.details).toMatchObject({
      formErrors: [],
      fieldErrors: { file: ["Elige un archivo"] },
    });
    await expectNothingStored();
  });

  it("names the file when the part is plain text", async () => {
    const form = uploadForm(FIELDS);
    form.append("file", "not a file");
    const error = await expectError(
      await upload(form),
      400,
      "VALIDATION_ERROR",
    );
    expect(error.details).toMatchObject({
      fieldErrors: { file: expect.any(Array) },
    });
  });

  it("reports name, version and type together in one response", async () => {
    const res = await upload(
      uploadForm(
        { type: "foto", name: "", version: "x".repeat(41) },
        { bytes: pdfBytes(), name: "a.pdf" },
      ),
    );
    const error = await expectError(res, 400, "VALIDATION_ERROR");
    const fieldErrors = (
      error.details as { fieldErrors: Record<string, string[]> }
    ).fieldErrors;
    expect(Object.keys(fieldErrors).sort()).toEqual([
      "name",
      "type",
      "version",
    ]);
    await expectNothingStored();
  });

  it("rejects a 121-character name and an empty version", async () => {
    const res = await pdfUpload({ name: "n".repeat(121), version: "" });
    const error = await expectError(res, 400, "VALIDATION_ERROR");
    const fieldErrors = (
      error.details as { fieldErrors: Record<string, string[]> }
    ).fieldErrors;
    expect(Object.keys(fieldErrors).sort()).toEqual(["name", "version"]);
  });

  it("reports the file together with the text fields", async () => {
    const res = await upload(
      uploadForm({ type: "cv", name: "", version: "v1" }),
    );
    const error = await expectError(res, 400, "VALIDATION_ERROR");
    const fieldErrors = (
      error.details as { fieldErrors: Record<string, string[]> }
    ).fieldErrors;
    expect(Object.keys(fieldErrors).sort()).toEqual(["file", "name"]);
  });

  it("answers 400, never 500, for a body that is not multipart", async () => {
    const res = await upload("garbage", {
      "content-type": "multipart/form-data",
    });
    await expectError(res, 400, "VALIDATION_ERROR");
  });

  it("answers 400 for a file whose name is empty after sanitizing", async () => {
    const res = await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(), name: "\u0007" }),
    );
    const error = await expectError(res, 400, "VALIDATION_ERROR");
    expect(error.details).toMatchObject({
      fieldErrors: { file: expect.any(Array) },
    });
    await expectNothingStored();
  });
});

describe("logging", () => {
  it("never writes the file name, the S3 key or the file content to the console", async () => {
    const spies = (["error", "log", "warn", "info"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    const name = "Secret Résumé 2026.pdf";

    await upload(uploadForm(FIELDS, { bytes: pdfBytes(), name, type: PDF }));
    await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(), name: "Secret Résumé.docx" }),
    );
    await upload(
      uploadForm(FIELDS, { bytes: pdfBytes(6 * MB), name: "Secret big.pdf" }),
    );

    const logged = spies
      .flatMap((spy) => spy.mock.calls)
      .map((args) => args.map(String).join(" "))
      .join("\n");
    expect(logged).not.toContain("Secret");
    expect(logged).not.toContain("documents/");
    expect(logged).not.toContain("%PDF");
  });
});

// Hand-written collaborators: the service is exercised without HTTP.
describe("DocumentsService.upload compensation", () => {
  const input = { type: "cv", name: "CV", version: "v1" } as const;
  const file = (): UploadedFile => ({ fileName: "cv.pdf", bytes: pdfBytes() });

  // The upload never reads: every other repository method fails loudly if it is ever reached.
  function repositoryWith(
    insert: DocumentsRepository["insert"],
  ): DocumentsRepository {
    const unused = async (): Promise<never> => {
      throw new Error("not used by upload");
    };
    return {
      insert,
      list: unused,
      findById: unused,
      usageCounts: unused,
      isInUse: unused,
      deleteById: unused,
    };
  }

  function failingInsert(error: unknown): DocumentsRepository {
    return repositoryWith(async () => {
      throw error;
    });
  }

  it("rejects with the insert error itself when the delete fails too", async () => {
    const insertError = new Error("insert failed");
    const objects = new Map<string, FakeObject>();
    const storage: DocumentStorage = {
      put: async (key, body, contentType) => {
        objects.set(key, { body, contentType });
      },
      get: async () => null,
      delete: async () => {
        throw new Error("delete failed");
      },
    };
    const service = createDocumentsService(failingInsert(insertError), storage);

    await expect(service.upload(input, file())).rejects.toBe(insertError);
  });

  it("leaves no object behind when the insert fails and the delete works", async () => {
    const insertError = new Error("insert failed");
    const local = fakeStorage();
    const service = createDocumentsService(
      failingInsert(insertError),
      local.storage,
    );

    await expect(service.upload(input, file())).rejects.toBe(insertError);
    expect(local.objects.size).toBe(0);
  });

  it("rejects with the put error and never inserts when the bucket fails", async () => {
    const putError = new Error("put failed");
    const insert = vi.fn();
    const storage: DocumentStorage = {
      put: async () => {
        throw putError;
      },
      get: async () => null,
      delete: async () => undefined,
    };
    const service = createDocumentsService(repositoryWith(insert), storage);

    await expect(service.upload(input, file())).rejects.toBe(putError);
    expect(insert).not.toHaveBeenCalled();
  });
});
