import { applicationSchema, tagSummarySchema, type Tag } from "@tfm/contracts";
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
let instant: Date;

function buildApp(): Hono {
  return createApp({ ...allUp, db: testDb.db, now: () => instant });
}

// Each call advances the clock one minute so createdAt order is deterministic.
let minute = 0;
function post(app: Hono, title: string, tags: Tag[]) {
  instant = new Date(Date.UTC(2026, 9, 30, 9, minute++));
  return app.request("/api/applications", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, company: "Acme", tags }),
  });
}

beforeAll(async () => {
  testDb = await useTestDb();
});

beforeEach(async () => {
  await testDb.reset();
  minute = 0;
  instant = new Date("2026-10-30T09:00:00.000Z");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await testDb.close();
});

describe("tags on POST /api/applications", () => {
  it("stores normalized tags with a key and never exposes the key", async () => {
    const res = await post(buildApp(), "Dev", [
      { label: " React ", group: "stack" },
      { label: "REACT", group: "language" },
    ]);
    expect(res.status).toBe(201);
    const text = await res.text();
    const body = applicationSchema.parse(JSON.parse(text));
    expect(body.tags).toStrictEqual([{ label: "React", group: "stack" }]);
    expect(text).not.toContain('"key"');

    const stored = await testDb.db.collection("applications").findOne({});
    expect(stored?.tags).toStrictEqual([
      { label: "React", group: "stack", key: "react" },
    ]);
  });

  it("answers 400 and stores nothing when more than 20 tags are sent", async () => {
    const tags = Array.from({ length: 21 }, (_, i) => ({
      label: `Tag ${i}`,
      group: "stack" as const,
    }));
    const res = await post(buildApp(), "Dev", tags);
    expect(res.status).toBe(400);
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });
});

describe("GET /api/tags", () => {
  it("answers an empty list when there are no applications", async () => {
    const res = await buildApp().request("/api/tags");
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual([]);
  });

  it("merges case variants, counts applications and orders by count, label (es) and group", async () => {
    const app = buildApp();
    await post(app, "App A", [
      { label: "React", group: "stack" },
      { label: "TypeScript", group: "stack" },
    ]);
    await post(app, "App B", [
      { label: "react", group: "stack" },
      { label: "Éxito", group: "stack" },
    ]);
    await post(app, "App C", [
      { label: "Zod", group: "stack" },
      { label: "Éxito", group: "stack" },
    ]);

    const res = await app.request("/api/tags");
    expect(res.status).toBe(200);
    const text = await res.text();
    const items = tagSummarySchema.array().parse(JSON.parse(text));
    expect(text).not.toContain('"key"');
    expect(items).toStrictEqual([
      { label: "Éxito", group: "stack", count: 2 },
      { label: "React", group: "stack", count: 2 },
      { label: "TypeScript", group: "stack", count: 1 },
      { label: "Zod", group: "stack", count: 1 },
    ]);
  });

  it("keeps the same label in two groups as two rows", async () => {
    const app = buildApp();
    await post(app, "App A", [{ label: "Docker", group: "stack" }]);
    await post(app, "App B", [{ label: "Docker", group: "nice_to_have" }]);

    const items = tagSummarySchema
      .array()
      .parse(await (await app.request("/api/tags")).json());
    expect(items).toStrictEqual([
      { label: "Docker", group: "stack", count: 1 },
      { label: "Docker", group: "nice_to_have", count: 1 },
    ]);
  });

  it("uses the spelling of the oldest application as label", async () => {
    const app = buildApp();
    await post(app, "App A", [{ label: "React", group: "stack" }]);
    await post(app, "App B", [{ label: "REACT", group: "stack" }]);

    const items = tagSummarySchema
      .array()
      .parse(await (await app.request("/api/tags")).json());
    expect(items).toStrictEqual([{ label: "React", group: "stack", count: 2 }]);
  });
});
