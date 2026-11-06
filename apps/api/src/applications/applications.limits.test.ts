import { errorResponseSchema } from "@tfm/contracts";
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

// Past the 256 KiB cap of the router (notes alone is 300,000 characters).
const oversized = JSON.stringify({
  title: "Frontend Developer",
  company: "Acme",
  notes: "a".repeat(300_000),
});

let testDb: TestDb;

function buildApp(): Hono {
  return createApp({ ...allUp, db: testDb.db });
}

async function count(): Promise<number> {
  return testDb.db.collection("applications").countDocuments();
}

beforeAll(async () => {
  testDb = await useTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await testDb.close();
});

describe("body limit on /api/applications", () => {
  it("refuses an oversized POST with 413 and stores nothing", async () => {
    const res = await buildApp().request("/api/applications", {
      method: "POST",
      headers: JSON_HEADERS,
      body: oversized,
    });
    expect(res.status).toBe(413);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Solicitud demasiado grande");
    expect(await count()).toBe(0);
  });

  it("refuses an oversized PUT with 413", async () => {
    const res = await buildApp().request(
      "/api/applications/507f1f77bcf86cd799439011",
      { method: "PUT", headers: JSON_HEADERS, body: oversized },
    );
    expect(res.status).toBe(413);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toBe("Solicitud demasiado grande");
  });

  it("still creates a normal application", async () => {
    const res = await buildApp().request("/api/applications", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title: "Frontend Developer", company: "Acme" }),
    });
    expect(res.status).toBe(201);
    expect(await count()).toBe(1);
  });
});
