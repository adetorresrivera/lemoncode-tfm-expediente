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

function patchStatus(
  app: Hono,
  id: string,
  body: unknown,
  headers: Record<string, string> = JSON_HEADERS,
): Promise<Response> | Response {
  return app.request(`/api/applications/${id}/status`, {
    method: "PATCH",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function change(
  app: Hono,
  id: string,
  status: string,
): Promise<Application> {
  const res = await patchStatus(app, id, { status });
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

describe("PATCH /api/applications/:id/status", () => {
  it("answers 200 with the new status, one new history entry and updatedAt equal to its instant", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "enviada");

    expect(updated.status).toBe("enviada");
    expect(updated.statusHistory).toHaveLength(2);
    expect(updated.statusHistory[1]).toEqual({
      status: "enviada",
      at: "2026-10-02T10:00:00.000Z",
    });
    expect(updated.updatedAt).toBe("2026-10-02T10:00:00.000Z");
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it("allows a move between any two of the seven statuses and records each in the history (rule 1)", async () => {
    const statuses = [
      "guardada",
      "enviada",
      "en_entrevistas",
      "oferta_recibida",
      "aceptada",
      "rechazada",
      "descartada",
    ] as const;
    const app = buildApp();
    let step = 0;

    for (const from of statuses) {
      for (const to of statuses) {
        if (from === to) continue;
        const created = await create(app, { title: "Dev", company: "Acme" });
        step += 1;
        tick(new Date(Date.UTC(2026, 9, 2) + step * 60_000).toISOString());
        if (from !== "guardada") await change(app, created.id, from);

        const moved = await change(app, created.id, to);

        expect(moved.status).toBe(to);
        expect(moved.statusHistory.at(-1)?.status).toBe(to);
        expect(moved.statusHistory.at(-2)?.status).toBe(from);
      }
    }
  });

  it("persists the change: a later GET returns the same document, status and history together", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "enviada");

    expect(await get(app, created.id)).toEqual(updated);
  });

  it("sets appliedAt to the instant of the history entry on the move to enviada", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    expect(created.appliedAt).toBeNull();

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "enviada");

    expect(updated.appliedAt).toBe("2026-10-02T10:00:00.000Z");
    expect(updated.appliedAt).toBe(updated.statusHistory.at(-1)?.at);
  });

  it("does not fill appliedAt on a move to any other status", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "rechazada");

    expect(updated.status).toBe("rechazada");
    expect(updated.appliedAt).toBeNull();
  });

  it("keeps the first appliedAt through guardada -> enviada -> guardada -> enviada", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-02T10:00:00.000Z");
    await change(app, created.id, "enviada");
    tick("2026-10-03T10:00:00.000Z");
    await change(app, created.id, "guardada");
    tick("2026-10-04T10:00:00.000Z");
    const again = await change(app, created.id, "enviada");

    expect(again.appliedAt).toBe("2026-10-02T10:00:00.000Z");
    expect(again.statusHistory.map((entry) => entry.status)).toEqual([
      "guardada",
      "enviada",
      "guardada",
      "enviada",
    ]);
    expect(again.updatedAt).toBe("2026-10-04T10:00:00.000Z");
  });

  it("never overwrites an appliedAt the user set", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Dev",
      company: "Acme",
      appliedAt: "2026-09-01T00:00:00.000Z",
    });

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "enviada");

    expect(updated.appliedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("treats a document without the appliedAt field as empty", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await testDb.db
      .collection("applications")
      .updateOne(
        { _id: new ObjectId(created.id) },
        { $unset: { appliedAt: "" } },
      );

    tick("2026-10-02T10:00:00.000Z");
    const updated = await change(app, created.id, "enviada");

    expect(updated.appliedAt).toBe("2026-10-02T10:00:00.000Z");
  });

  it("is idempotent for the current status: 200, same document, no history entry, updatedAt kept", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    tick("2026-10-02T10:00:00.000Z");
    const sent = await change(app, created.id, "enviada");

    tick("2026-10-05T10:00:00.000Z");
    const same = await change(app, created.id, "enviada");

    expect(same).toEqual(sent);
    expect(same.statusHistory).toHaveLength(2);
    expect(same.updatedAt).toBe("2026-10-02T10:00:00.000Z");
  });

  it("writes exactly one extra history entry for three concurrent moves to enviada", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    tick("2026-10-02T10:00:00.000Z");
    const responses = await Promise.all([
      patchStatus(app, created.id, { status: "enviada" }),
      patchStatus(app, created.id, { status: "enviada" }),
      patchStatus(app, created.id, { status: "enviada" }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([200, 200, 200]);
    const stored = await get(app, created.id);
    expect(stored.statusHistory).toHaveLength(2);
    expect(stored.status).toBe("enviada");
  });

  it("answers 400 VALIDATION_ERROR for extra keys and for an unknown status", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    for (const body of [
      { status: "enviada", extra: 1 },
      { status: "nope" },
      {},
    ]) {
      const res = await patchStatus(app, created.id, body);
      expect(res.status).toBe(400);
      const parsed = errorResponseSchema.parse(await res.json());
      expect(parsed.error.code).toBe("VALIDATION_ERROR");
    }
    expect((await get(app, created.id)).statusHistory).toHaveLength(1);
  });

  it("answers 400 for a non-JSON content type", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    const res = await patchStatus(
      app,
      created.id,
      JSON.stringify({ status: "enviada" }),
      { "content-type": "text/plain" },
    );

    expect(res.status).toBe(400);
  });

  it("answers 404 for an unknown id and for a malformed id, and creates nothing", async () => {
    const app = buildApp();

    for (const id of ["0123456789abcdef01234567", "abc"]) {
      const res = await patchStatus(app, id, { status: "enviada" });
      expect(res.status).toBe(404);
      const parsed = errorResponseSchema.parse(await res.json());
      expect(parsed.error.code).toBe("NOT_FOUND");
    }
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });
});
