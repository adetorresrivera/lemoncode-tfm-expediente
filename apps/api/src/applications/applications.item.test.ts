import {
  applicationSchema,
  errorResponseSchema,
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
import { ApiError } from "../errors.js";
import { parseObjectId } from "../http/object-id.js";
import { useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };
const NOT_FOUND_MESSAGE = "Candidatura no encontrada";

let testDb: TestDb;
const instant = new Date("2026-10-30T09:00:00.000Z");

function buildApp(): Hono {
  return createApp({ ...allUp, db: testDb.db, now: () => instant });
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

async function expectNotFound(res: Response): Promise<void> {
  expect(res.status).toBe(404);
  const body = errorResponseSchema.parse(await res.json());
  expect(body.error.code).toBe("NOT_FOUND");
  expect(body.error.message).toBe(NOT_FOUND_MESSAGE);
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

describe("parseObjectId", () => {
  it("accepts upper-case and lower-case hexadecimal ids alike", () => {
    const upper = parseObjectId("ABCDEF0123456789ABCDEF01");
    const mixed = parseObjectId("ABCDEF0123456789abcdef01");
    const lower = parseObjectId("abcdef0123456789abcdef01");
    expect(upper.toHexString()).toBe("abcdef0123456789abcdef01");
    expect(mixed.equals(lower)).toBe(true);
  });

  it.each([
    ["too short", "abc"],
    ["23 characters", "abcdef0123456789abcdef0"],
    ["25 characters", "abcdef0123456789abcdef012"],
    ["24 non-hex characters", "zzzzzzzzzzzzzzzzzzzzzzzz"],
    ["empty", ""],
    ["12 raw bytes", "abcdefghijkl"],
  ])("throws ApiError 404 NOT_FOUND for %s", (_label, raw) => {
    let thrown: unknown;
    try {
      parseObjectId(raw);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    const error = thrown as ApiError;
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe(NOT_FOUND_MESSAGE);
  });
});

describe("GET /api/applications/:id", () => {
  it("answers 200 with the application, without _id or tag keys", async () => {
    const app = buildApp();
    const created = await create(app, {
      title: "Frontend React",
      company: "Acme",
      tags: [
        { label: "React", group: "stack" },
        { label: "Remoto", group: "nice_to_have" },
      ],
    });

    const res = await app.request(`/api/applications/${created.id}`);
    expect(res.status).toBe(200);
    const raw: unknown = await res.json();
    const item = applicationSchema.parse(raw);
    expect(item).toEqual(created);
    expect(item.tags).toHaveLength(2);
    expect(raw).not.toHaveProperty("_id");
    for (const tag of (raw as { tags: object[] }).tags) {
      expect(tag).not.toHaveProperty("key");
      expect(tag).not.toHaveProperty("_id");
    }
  });

  it("has the same shape as the matching item of the list", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Beta" });

    const listRes = await app.request("/api/applications");
    const listed = applicationSchema.array().parse(await listRes.json());
    const itemRes = await app.request(`/api/applications/${created.id}`);

    expect(applicationSchema.parse(await itemRes.json())).toEqual(
      listed.find((a) => a.id === created.id),
    );
  });

  it("addresses the same application with an upper-case id", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Beta" });

    const res = await app.request(
      `/api/applications/${created.id.toUpperCase()}`,
    );
    expect(res.status).toBe(200);
    expect(applicationSchema.parse(await res.json()).id).toBe(created.id);
  });

  it("answers 404 NOT_FOUND for a valid but unknown id", async () => {
    const app = buildApp();
    await expectNotFound(
      await app.request("/api/applications/0123456789abcdef01234567"),
    );
  });

  it.each([
    ["short", "abc"],
    ["non-hex 24 characters", "zzzzzzzzzzzzzzzzzzzzzzzz"],
    ["23 characters", "abcdef0123456789abcdef0"],
    ["25 characters", "abcdef0123456789abcdef012"],
    ["12 raw bytes", "abcdefghijkl"],
  ])("answers 404 JSON, never 500, for a malformed id (%s)", async (_l, id) => {
    const app = buildApp();
    await expectNotFound(await app.request(`/api/applications/${id}`));
  });
});
