import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicationSchema, errorResponseSchema } from "@tfm/contracts";
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
import { TEST_DB_NAME, useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };

let testDb: TestDb;
let instant: Date;

const clock = (): Date => instant;

function buildApp(extra: Partial<AppDeps> = {}): Hono {
  return createApp({ ...allUp, db: testDb.db, now: clock, ...extra });
}

function post(app: Hono, body: unknown, headers = JSON_HEADERS) {
  return app.request("/api/applications", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function count(): Promise<number> {
  return testDb.db.collection("applications").countDocuments();
}

beforeAll(async () => {
  testDb = await useTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  instant = new Date("2026-10-30T09:00:00.000Z");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await testDb.close();
});

describe("test database helper", () => {
  it("is bound to tfm_test", () => {
    expect(TEST_DB_NAME).toBe("tfm_test");
    expect(testDb.db.databaseName).toBe("tfm_test");
  });
});

describe("POST /api/applications", () => {
  it("creates an application from title and company only", async () => {
    const res = await post(buildApp(), {
      title: "Frontend Developer",
      company: "Acme",
    });
    expect(res.status).toBe(201);
    const text = await res.text();
    const body = applicationSchema.parse(JSON.parse(text));

    expect(body.id).toMatch(/^[0-9a-f]{24}$/);
    expect(JSON.parse(text)).not.toHaveProperty("_id");
    expect(body.status).toBe("guardada");
    expect(body.statusHistory).toEqual([
      { status: "guardada", at: "2026-10-30T09:00:00.000Z" },
    ]);
    expect(body.interviews).toEqual([]);
    expect(body.ownerId).toBeNull();
    expect(body.appliedAt).toBeNull();
    expect(body.createdAt).toBe("2026-10-30T09:00:00.000Z");
    expect(body.updatedAt).toBe(body.createdAt);
    expect(body.createdAt.endsWith("Z")).toBe(true);
    expect(await count()).toBe(1);
  });

  it("sets appliedAt to the creation instant for status enviada without appliedAt", async () => {
    const res = await post(buildApp(), {
      title: "Dev",
      company: "Acme",
      status: "enviada",
    });
    const body = applicationSchema.parse(await res.json());
    expect(body.appliedAt).toBe(body.createdAt);
    expect(body.statusHistory).toHaveLength(1);
    expect(body.statusHistory[0]?.status).toBe("enviada");
  });

  it("keeps an explicit appliedAt for status enviada", async () => {
    const res = await post(buildApp(), {
      title: "Dev",
      company: "Acme",
      status: "enviada",
      appliedAt: "2026-10-01T10:00:00.000Z",
    });
    const body = applicationSchema.parse(await res.json());
    expect(body.appliedAt).toBe("2026-10-01T10:00:00.000Z");
  });

  it("stores appliedAt null for any other status without appliedAt", async () => {
    const res = await post(buildApp(), {
      title: "Dev",
      company: "Acme",
      status: "rechazada",
    });
    const body = applicationSchema.parse(await res.json());
    expect(body.appliedAt).toBeNull();
  });

  it("answers 400 VALIDATION_ERROR and stores nothing for invalid bodies", async () => {
    const app = buildApp();
    const invalid: unknown[] = [
      { title: "A", company: "Acme" },
      { title: "Dev", company: "Acme", status: "nope" },
      { title: { $ne: null }, company: "Acme" },
    ];
    for (const body of invalid) {
      const res = await post(app, body);
      expect(res.status).toBe(400);
      const parsed = errorResponseSchema.parse(await res.json());
      expect(parsed.error.code).toBe("VALIDATION_ERROR");
      expect(parsed.error.details).toBeDefined();
    }
    expect(await count()).toBe(0);
  });

  it("answers 400 VALIDATION_ERROR for a malformed JSON body", async () => {
    const res = await post(buildApp(), "{");
    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(await count()).toBe(0);
  });

  it("answers 400 VALIDATION_ERROR when the content-type is not application/json", async () => {
    const res = await post(
      buildApp(),
      JSON.stringify({ title: "Dev", company: "Acme" }),
      { "content-type": "text/plain" },
    );
    expect(res.status).toBe(400);
    const parsed = errorResponseSchema.parse(await res.json());
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(await count()).toBe(0);
  });

  it("ignores id, createdAt, statusHistory, interviews and ownerId sent by the client", async () => {
    const res = await post(buildApp(), {
      title: "Dev",
      company: "Acme",
      id: "forged",
      _id: "forged",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      statusHistory: [
        { status: "oferta", at: "2000-01-01T00:00:00.000Z" },
        { status: "enviada", at: "2000-01-02T00:00:00.000Z" },
      ],
      interviews: [{ id: "x" }],
      ownerId: "x",
    });
    expect(res.status).toBe(201);
    const body = applicationSchema.parse(await res.json());
    expect(body.id).not.toBe("forged");
    expect(body.statusHistory).toHaveLength(1);
    expect(body.interviews).toEqual([]);
    expect(body.ownerId).toBeNull();
    expect(body.createdAt).toBe("2026-10-30T09:00:00.000Z");

    const stored = await testDb.db.collection("applications").findOne({});
    expect(stored).not.toBeNull();
    expect(stored?.ownerId).toBeNull();
    expect(stored?.statusHistory).toHaveLength(1);
    expect(stored?.interviews).toEqual([]);
  });

  it("never deduplicates: two identical bodies create two applications", async () => {
    const app = buildApp();
    const payload = { title: "Dev", company: "Acme" };
    const first = applicationSchema.parse(
      await (await post(app, payload)).json(),
    );
    const second = applicationSchema.parse(
      await (await post(app, payload)).json(),
    );
    expect(first.id).not.toBe(second.id);
    expect(await count()).toBe(2);
  });

  it("stores three complete documents for three concurrent posts", async () => {
    const app = buildApp();
    const responses = await Promise.all(
      ["A1", "B2", "C3"].map((suffix) =>
        post(app, { title: `Dev ${suffix}`, company: "Acme" }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201]);

    const docs = await testDb.db.collection("applications").find({}).toArray();
    expect(docs).toHaveLength(3);
    for (const doc of docs) {
      expect(doc.statusHistory).toHaveLength(1);
      expect(doc.createdAt).toEqual(doc.updatedAt);
    }
  });
});

describe("GET /api/applications", () => {
  it("answers 200 with an empty list when nothing is stored", async () => {
    const res = await buildApp().request("/api/applications");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists applications by updatedAt descending", async () => {
    const app = buildApp();
    const instants = [
      "2026-10-28T09:00:00.000Z",
      "2026-10-29T09:00:00.000Z",
      "2026-10-30T09:00:00.000Z",
    ];
    for (const [index, iso] of instants.entries()) {
      instant = new Date(iso);
      await post(app, { title: `Dev ${index + 1}`, company: "Acme" });
    }

    const res = await app.request("/api/applications");
    expect(res.status).toBe(200);
    const list = applicationSchema.array().parse(await res.json());
    expect(list.map((a) => a.title)).toEqual(["Dev 3", "Dev 2", "Dev 1"]);
  });

  describe("when the API also serves the built web app", () => {
    let dist: string;

    beforeEach(async () => {
      dist = await mkdtemp(join(tmpdir(), "tfm-web-dist-"));
      await writeFile(
        join(dist, "index.html"),
        '<!doctype html><div id="root"></div>',
      );
    });

    afterEach(async () => {
      await rm(dist, { recursive: true, force: true });
    });

    it("still answers the applications as JSON, never index.html", async () => {
      const app = buildApp({ webDistDir: dist });
      await post(app, { title: "Dev", company: "Acme" });

      const res = await app.request("/api/applications");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      const list = applicationSchema.array().parse(await res.json());
      expect(list).toHaveLength(1);
    });
  });
});
