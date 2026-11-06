import {
  applicationSchema,
  documentListItemSchema,
  documentSchema,
  errorResponseSchema,
  type Application,
  type Document,
  type DocumentListItem,
} from "@tfm/contracts";
import { ObjectId } from "mongodb";
import type { Hono } from "hono";
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
import { createDocumentsRepository } from "../documents/documents.repository.js";
import { fakeStorage, pdfBytes, uploadForm } from "../test/documents.js";
import { useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };
const UNKNOWN_ID = "0123456789abcdef01234567";

let testDb: TestDb;
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
  clock = new Date("2026-11-03T09:00:00.000Z");
  app = createApp({
    ...allUp,
    db: testDb.db,
    storage: fakeStorage().storage,
    now: () => clock,
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function uploadPdf(
  type: "cv" | "carta",
  name: string,
): Promise<Document> {
  clock = new Date(clock.getTime() + 60_000);
  const res = await app.request("/api/documents", {
    method: "POST",
    body: uploadForm(
      { type, name, version: "v1" },
      { bytes: pdfBytes(), name: `${name}.pdf` },
    ),
  });
  expect(res.status).toBe(201);
  return documentSchema.parse(await res.json());
}

async function post(body: unknown): Promise<Response> {
  return await app.request("/api/applications", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

async function put(id: string, body: unknown): Promise<Response> {
  return await app.request(`/api/applications/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

async function createApplication(
  extra: Record<string, unknown> = {},
): Promise<Application> {
  const res = await post({ title: "Dev", company: "Acme", ...extra });
  expect(res.status).toBe(201);
  return applicationSchema.parse(await res.json());
}

async function getApplication(id: string): Promise<Application> {
  const res = await app.request(`/api/applications/${id}`);
  expect(res.status).toBe(200);
  return applicationSchema.parse(await res.json());
}

async function listDocuments(): Promise<DocumentListItem[]> {
  const res = await app.request("/api/documents");
  expect(res.status).toBe(200);
  return documentListItemSchema.array().parse(await res.json());
}

async function removeDocument(id: string): Promise<Response> {
  return await app.request(`/api/documents/${id}`, { method: "DELETE" });
}

async function expectLinkErrors(
  res: Response,
  expected: Record<string, string>,
): Promise<void> {
  expect(res.status).toBe(400);
  const body = errorResponseSchema.parse(await res.json());
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(body.error.message).toBe("Datos no válidos");
  const details = body.error.details as {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
  expect(details.formErrors).toEqual([]);
  expect(Object.keys(details.fieldErrors).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  for (const [field, message] of Object.entries(expected)) {
    expect(details.fieldErrors[field]?.[0]).toBe(message);
  }
}

describe("documents repository findTypes", () => {
  it("returns only the known ids with their type and ignores malformed ones", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const carta = await uploadPdf("carta", "Carta");
    const repository = createDocumentsRepository(testDb.db);

    const types = await repository.findTypes([
      cv.id,
      carta.id,
      "cv-1",
      UNKNOWN_ID,
    ]);

    expect([...types.entries()].sort()).toEqual(
      [
        [cv.id, "cv"],
        [carta.id, "carta"],
      ].sort(),
    );
    expect((await repository.findTypes(["cv-1"])).size).toBe(0);
    expect((await repository.findTypes([])).size).toBe(0);
  });
});

describe("POST /api/applications links", () => {
  it("stores and returns a CV and a cover letter that exist with the right type", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const carta = await uploadPdf("carta", "Carta");

    const created = await createApplication({
      cvDocumentId: cv.id,
      coverLetterDocumentId: carta.id,
    });

    expect(created.cvDocumentId).toBe(cv.id);
    expect(created.coverLetterDocumentId).toBe(carta.id);
    const fetched = await getApplication(created.id);
    expect(fetched.cvDocumentId).toBe(cv.id);
    expect(fetched.coverLetterDocumentId).toBe(carta.id);
  });

  it("accepts null links and stores null", async () => {
    const created = await createApplication({
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
    expect(created.cvDocumentId).toBeNull();
    expect(created.coverLetterDocumentId).toBeNull();
  });

  it("rejects a cover letter as CV and a CV as cover letter, writing nothing", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const carta = await uploadPdf("carta", "Carta");

    await expectLinkErrors(
      await post({ title: "Dev", company: "Acme", cvDocumentId: carta.id }),
      { cvDocumentId: "El documento no es un CV" },
    );
    await expectLinkErrors(
      await post({
        title: "Dev",
        company: "Acme",
        coverLetterDocumentId: cv.id,
      }),
      { coverLetterDocumentId: "El documento no es una carta de presentación" },
    );
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });

  it("reports a malformed and an unknown id together as nonexistent", async () => {
    await expectLinkErrors(
      await post({
        title: "Dev",
        company: "Acme",
        cvDocumentId: "cv-1",
        coverLetterDocumentId: UNKNOWN_ID,
      }),
      {
        cvDocumentId: "El documento no existe",
        coverLetterDocumentId: "El documento no existe",
      },
    );
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });
});

describe("PUT /api/applications/:id links", () => {
  it("replaces links with valid ids, and clears them when omitted or null", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const cv2 = await uploadPdf("cv", "Otro CV");
    const carta = await uploadPdf("carta", "Carta");
    const created = await createApplication({ cvDocumentId: cv.id });

    const replaced = applicationSchema.parse(
      await (
        await put(created.id, {
          title: "Dev",
          company: "Acme",
          cvDocumentId: cv2.id,
          coverLetterDocumentId: carta.id,
        })
      ).json(),
    );
    expect(replaced.cvDocumentId).toBe(cv2.id);
    expect(replaced.coverLetterDocumentId).toBe(carta.id);

    const omitted = applicationSchema.parse(
      await (await put(created.id, { title: "Dev", company: "Acme" })).json(),
    );
    expect(omitted.cvDocumentId).toBeNull();
    expect(omitted.coverLetterDocumentId).toBeNull();

    await put(created.id, {
      title: "Dev",
      company: "Acme",
      cvDocumentId: cv.id,
    });
    const nulls = applicationSchema.parse(
      await (
        await put(created.id, {
          title: "Dev",
          company: "Acme",
          cvDocumentId: null,
          coverLetterDocumentId: null,
        })
      ).json(),
    );
    expect(nulls.cvDocumentId).toBeNull();
    expect(nulls.coverLetterDocumentId).toBeNull();
  });

  it("rejects a wrong-type link with 400 and leaves every stored field unchanged", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const carta = await uploadPdf("carta", "Carta");
    const created = await createApplication({
      title: "Original",
      cvDocumentId: cv.id,
    });
    const before = await getApplication(created.id);

    await expectLinkErrors(
      await put(created.id, {
        title: "Changed",
        company: "Other",
        cvDocumentId: carta.id,
      }),
      { cvDocumentId: "El documento no es un CV" },
    );

    expect(await getApplication(created.id)).toEqual(before);
  });

  it("validates input before existence: bad link on unknown id is 400, valid links on unknown id is 404", async () => {
    const cv = await uploadPdf("cv", "Mi CV");
    const carta = await uploadPdf("carta", "Carta");

    await expectLinkErrors(
      await put(UNKNOWN_ID, {
        title: "Dev",
        company: "Acme",
        cvDocumentId: carta.id,
      }),
      { cvDocumentId: "El documento no es un CV" },
    );

    const res = await put(UNKNOWN_ID, {
      title: "Dev",
      company: "Acme",
      cvDocumentId: cv.id,
    });
    expect(res.status).toBe(404);
  });
});

describe("links seen by the documents API", () => {
  it("makes a linked document undeletable until the link is cleared (rule 4)", async () => {
    const a = await uploadPdf("cv", "Mi CV");
    const created = await createApplication({ cvDocumentId: a.id });

    const listed = await listDocuments();
    expect(listed.find((d) => d.id === a.id)?.usedBy).toBe(1);
    expect((await removeDocument(a.id)).status).toBe(409);

    const res = await put(created.id, {
      title: "Dev",
      company: "Acme",
      cvDocumentId: null,
    });
    expect(res.status).toBe(200);

    expect((await listDocuments()).find((d) => d.id === a.id)?.usedBy).toBe(0);
    expect((await removeDocument(a.id)).status).toBe(204);
  });

  it("keeps the documents of a deleted application, now deletable (rule 5)", async () => {
    const a = await uploadPdf("cv", "Mi CV");
    const b = await uploadPdf("carta", "Carta");
    const created = await createApplication({
      cvDocumentId: a.id,
      coverLetterDocumentId: b.id,
    });

    const res = await app.request(`/api/applications/${created.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(
      await testDb.db
        .collection("applications")
        .countDocuments({ _id: new ObjectId(created.id) }),
    ).toBe(0);

    const listed = await listDocuments();
    expect(listed.map((d) => d.id).sort()).toEqual([a.id, b.id].sort());
    expect(listed.every((d) => d.usedBy === 0)).toBe(true);
    expect((await removeDocument(a.id)).status).toBe(204);
    expect((await removeDocument(b.id)).status).toBe(204);
  });
});
