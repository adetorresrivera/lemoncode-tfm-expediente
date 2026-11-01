import {
  applicationSchema,
  errorResponseSchema,
  type Application,
  type ApplicationInput,
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
import { useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };

let testDb: TestDb;
// The injected clock: tests move it to give every change a distinct instant.
let clock = new Date("2026-10-01T09:00:00.000Z");

function tick(iso: string): void {
  clock = new Date(iso);
}

function buildApp(): Hono {
  return createApp({ ...allUp, db: testDb.db, now: () => clock });
}

async function create(
  app: Hono,
  input: Partial<ApplicationInput> & { title: string; company: string },
): Promise<Application> {
  const res = await app.request("/api/applications", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
  expect(res.status).toBe(201);
  return applicationSchema.parse(await res.json());
}

function put(
  app: Hono,
  id: string,
  body: unknown,
): Promise<Response> | Response {
  return app.request(`/api/applications/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

async function update(
  app: Hono,
  id: string,
  body: unknown,
): Promise<Application> {
  const res = await put(app, id, body);
  expect(res.status).toBe(200);
  return applicationSchema.parse(await res.json());
}

async function get(app: Hono, id: string): Promise<Application> {
  const res = await app.request(`/api/applications/${id}`);
  expect(res.status).toBe(200);
  return applicationSchema.parse(await res.json());
}

beforeAll(async () => {
  testDb = await useTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  tick("2026-10-01T09:00:00.000Z");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await testDb.close();
});

describe("PUT /api/applications/:id", () => {
  it("updates the editable fields, normalizes tags and keeps status, history, interviews, createdAt and ownerId", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      status: "en_entrevistas",
    });

    tick("2026-10-05T12:00:00.000Z");
    const updated = await update(app, created.id, {
      title: "Senior Dev",
      company: "Globex",
      location: "Madrid",
      workMode: "hibrido",
      seniority: "senior",
      contractType: "indefinido",
      salaryMin: 50000,
      salaryMax: 60000,
      currency: "eur",
      tags: [
        { label: "react", group: "stack" },
        { label: "React", group: "stack" },
        { label: "Inglés", group: "language" },
      ],
      sourceUrl: "https://example.com/job",
      appliedAt: "2026-10-01T10:00:00.000Z",
      notes: "Llamar el lunes",
    });

    expect(updated.title).toBe("Senior Dev");
    expect(updated.company).toBe("Globex");
    expect(updated.location).toBe("Madrid");
    expect(updated.workMode).toBe("hibrido");
    expect(updated.seniority).toBe("senior");
    expect(updated.contractType).toBe("indefinido");
    expect(updated.salaryMin).toBe(50000);
    expect(updated.salaryMax).toBe(60000);
    expect(updated.currency).toBe("EUR");
    expect(updated.tags).toEqual([
      { label: "react", group: "stack" },
      { label: "Inglés", group: "language" },
    ]);
    expect(updated.sourceUrl).toBe("https://example.com/job");
    expect(updated.appliedAt).toBe("2026-10-01T10:00:00.000Z");
    expect(updated.notes).toBe("Llamar el lunes");
    expect(updated.status).toBe("en_entrevistas");
    expect(updated.statusHistory).toEqual(created.statusHistory);
    expect(updated.interviews).toEqual([]);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.ownerId).toBeNull();
    expect(updated.updatedAt).toBe("2026-10-05T12:00:00.000Z");
    expect(await get(app, created.id)).toEqual(updated);

    const stored = await testDb.db
      .collection("applications")
      .findOne({ _id: new ObjectId(created.id) });
    expect(stored?.tags).toEqual([
      { label: "react", group: "stack", key: "react" },
      { label: "Inglés", group: "language", key: "inglés" },
    ]);
  });

  it("keeps status and statusHistory when the body says rechazada and when it has no status", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      status: "enviada",
    });

    const forged = await update(app, created.id, {
      title: "Dev 2",
      company: "Acme",
      status: "rechazada",
    });
    expect(forged.status).toBe("enviada");
    expect(forged.statusHistory).toEqual(created.statusHistory);

    const withoutStatus = await update(app, created.id, {
      title: "Dev 3",
      company: "Acme",
    });
    expect(withoutStatus.status).toBe("enviada");
    expect(withoutStatus.statusHistory).toEqual(created.statusHistory);
  });

  it("ignores forged ownerId, createdAt, statusHistory, interviews and id in the body", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-05T12:00:00.000Z");
    const updated = await update(app, created.id, {
      title: "Dev 2",
      company: "Acme",
      id: "0123456789abcdef01234567",
      ownerId: "someone",
      createdAt: "2000-01-01T00:00:00.000Z",
      statusHistory: [
        { status: "oferta_recibida", at: "2000-01-01T00:00:00.000Z" },
      ],
      interviews: [{ forged: true }],
    });

    expect(updated.id).toBe(created.id);
    expect(updated.ownerId).toBeNull();
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.statusHistory).toEqual(created.statusHistory);
    expect(updated.interviews).toEqual([]);
  });

  it("keeps the document links, whether the body omits them, sends null or sends other values", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await testDb.db
      .collection("applications")
      .updateOne(
        { _id: new ObjectId(created.id) },
        { $set: { cvDocumentId: "cv-1", coverLetterDocumentId: "carta-1" } },
      );

    const omitted = await update(app, created.id, {
      title: "Dev 2",
      company: "Acme",
    });
    expect(omitted.cvDocumentId).toBe("cv-1");
    expect(omitted.coverLetterDocumentId).toBe("carta-1");

    const nulls = await update(app, created.id, {
      title: "Dev 3",
      company: "Acme",
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
    expect(nulls.cvDocumentId).toBe("cv-1");
    expect(nulls.coverLetterDocumentId).toBe("carta-1");

    const others = await update(app, created.id, {
      title: "Dev 4",
      company: "Acme",
      cvDocumentId: "cv-2",
      coverLetterDocumentId: "carta-2",
    });
    expect(others.cvDocumentId).toBe("cv-1");
    expect(others.coverLetterDocumentId).toBe("carta-1");
  });

  it("writes offerText exactly as sent and clears it with null or when omitted", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      offerText: "texto",
    });

    const replaced = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      offerText: "otro",
    });
    expect(replaced.offerText).toBe("otro");
    const stored = await testDb.db
      .collection("applications")
      .findOne({ _id: new ObjectId(created.id) });
    expect(stored?.offerText).toBe("otro");

    const cleared = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      offerText: null,
    });
    expect(cleared.offerText).toBeNull();

    await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      offerText: "de nuevo",
    });
    const omitted = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
    });
    expect(omitted.offerText).toBeNull();
  });

  it("stores an offerText of 20,000 characters and rejects 20,001 without changing anything", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      offerText: "texto",
    });

    const limit = "a".repeat(20000);
    const accepted = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      offerText: limit,
    });
    expect(accepted.offerText).toBe(limit);

    const res = await put(app, created.id, {
      title: "Cambiado",
      company: "Acme",
      offerText: "a".repeat(20001),
    });
    expect(res.status).toBe(400);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");

    const stored = await testDb.db
      .collection("applications")
      .findOne({ _id: new ObjectId(created.id) });
    expect(stored?.offerText).toBe(limit);
    expect(stored?.title).toBe("Dev");
  });

  it("clears appliedAt with null and stores a given instant", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      appliedAt: "2026-09-01T10:00:00.000Z",
    });

    const cleared = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      appliedAt: null,
    });
    expect(cleared.appliedAt).toBeNull();

    const set = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
      appliedAt: "2026-10-01T10:00:00.000Z",
    });
    expect(set.appliedAt).toBe("2026-10-01T10:00:00.000Z");
  });

  it("resets optional fields missing from the body to null (full replacement of the editable set)", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      location: "Madrid",
      notes: "nota",
      tags: [{ label: "React", group: "stack" }],
    });

    const updated = await update(app, created.id, {
      title: "Dev",
      company: "Acme",
    });

    expect(updated.location).toBeNull();
    expect(updated.notes).toBeNull();
    expect(updated.tags).toEqual([]);
  });

  it("is idempotent: two identical PUTs give the same fields and history, and updatedAt advances", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const body = {
      title: "Dev 2",
      company: "Acme",
      notes: "nota",
      tags: [{ label: "React", group: "stack" }],
    };

    tick("2026-10-02T10:00:00.000Z");
    const first = await update(app, created.id, body);
    tick("2026-10-03T10:00:00.000Z");
    const second = await update(app, created.id, body);

    expect({ ...second, updatedAt: "" }).toEqual({ ...first, updatedAt: "" });
    expect(first.updatedAt).toBe("2026-10-02T10:00:00.000Z");
    expect(second.updatedAt).toBe("2026-10-03T10:00:00.000Z");
    expect(second.statusHistory).toEqual(first.statusHistory);
  });

  it("resolves two concurrent PUTs last-write-wins and leaves the history untouched", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    const responses = await Promise.all([
      put(app, created.id, { title: "Titulo A", company: "Acme" }),
      put(app, created.id, { title: "Titulo B", company: "Acme" }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([200, 200]);
    const stored = await get(app, created.id);
    expect(["Titulo A", "Titulo B"]).toContain(stored.title);
    expect(stored.statusHistory).toEqual(created.statusHistory);
    expect(stored.status).toBe("guardada");
  });

  it("answers 404 for an unknown id and for a malformed id, and creates nothing", async () => {
    const app = buildApp();

    for (const id of ["0123456789abcdef01234567", "abc"]) {
      const res = await put(app, id, { title: "Dev", company: "Acme" });
      expect(res.status).toBe(404);
      const parsed = errorResponseSchema.parse(await res.json());
      expect(parsed.error.code).toBe("NOT_FOUND");
    }
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });

  it("answers 400 VALIDATION_ERROR for an invalid body and changes nothing", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    for (const body of [
      { title: "A", company: "Acme" },
      { title: "Dev", company: "" },
      { title: "Dev", company: "Acme", salaryMin: 10, salaryMax: 5 },
      { title: "Dev", company: "Acme", sourceUrl: "javascript:alert(1)" },
    ]) {
      const res = await put(app, created.id, body);
      expect(res.status).toBe(400);
      const parsed = errorResponseSchema.parse(await res.json());
      expect(parsed.error.code).toBe("VALIDATION_ERROR");
    }
    expect(await get(app, created.id)).toEqual(created);
  });

  it("answers 400 for a non-JSON content type", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    const res = await app.request(`/api/applications/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ title: "Dev 2", company: "Acme" }),
    });

    expect(res.status).toBe(400);
    expect((await get(app, created.id)).title).toBe("Dev");
  });
});
