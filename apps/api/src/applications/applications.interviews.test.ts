import {
  applicationSchema,
  type Application,
  type ApplicationInput,
} from "@tfm/contracts";
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

async function change(
  app: Hono,
  id: string,
  status: string,
): Promise<Application> {
  const res = await app.request(`/api/applications/${id}/status`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ status }),
  });
  expect(res.status).toBe(200);
  return applicationSchema.parse(await res.json());
}

async function get(app: Hono, id: string): Promise<Application> {
  const res = await app.request(`/api/applications/${id}`);
  expect(res.status).toBe(200);
  return applicationSchema.parse(await res.json());
}

function postInterview(
  app: Hono,
  id: string,
  body: unknown,
  headers: Record<string, string> = JSON_HEADERS,
): Promise<Response> | Response {
  return app.request(`/api/applications/${id}/interviews`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const TECNICA = { type: "tecnica", mode: "online" };

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

describe("POST /api/applications/:id/interviews", () => {
  it("creates round 1, moves an enviada application to en_entrevistas and sets updatedAt", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    tick("2026-10-02T10:00:00.000Z");
    await change(app, created.id, "enviada");

    tick("2026-10-03T11:30:00.000Z");
    const res = await postInterview(app, created.id, TECNICA);

    expect(res.status).toBe(201);
    const body = applicationSchema.parse(await res.json());
    expect(body.status).toBe("en_entrevistas");
    expect(body.statusHistory).toHaveLength(3);
    expect(body.statusHistory[2]).toStrictEqual({
      status: "en_entrevistas",
      at: "2026-10-03T11:30:00.000Z",
    });
    expect(body.interviews).toStrictEqual([
      {
        id: expect.stringMatching(/^[0-9a-f]{24}$/),
        round: 1,
        type: "tecnica",
        scheduledAt: null,
        mode: "online",
        notes: null,
        outcome: "pendiente",
      },
    ]);
    expect(body.updatedAt).toBe("2026-10-03T11:30:00.000Z");
    expect(await get(app, created.id)).toStrictEqual(body);
  });
});
