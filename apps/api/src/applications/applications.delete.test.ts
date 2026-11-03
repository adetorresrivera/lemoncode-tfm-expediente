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
import { useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const JSON_HEADERS = { "content-type": "application/json" };

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

function remove(app: Hono, id: string): Promise<Response> | Response {
  return app.request(`/api/applications/${id}`, { method: "DELETE" });
}

async function expectNotFound(res: Response): Promise<void> {
  expect(res.status).toBe(404);
  const body = errorResponseSchema.parse(await res.json());
  expect(body.error.code).toBe("NOT_FOUND");
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

describe("DELETE /api/applications/:id", () => {
  it("answers 204 with an empty body and then the application is gone", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    const res = await remove(app, created.id);

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    await expectNotFound(await app.request(`/api/applications/${created.id}`));
  });

  it("removes only that application", async () => {
    const app = buildApp();
    const doomed = await create(app, { title: "Doomed", company: "Acme" });
    const kept = await create(app, { title: "Kept", company: "Beta" });

    expect((await remove(app, doomed.id)).status).toBe(204);

    const listed = applicationSchema
      .array()
      .parse(await (await app.request("/api/applications")).json());
    expect(listed.map((item) => item.id)).toEqual([kept.id]);
  });

  it("leaves the documents collection untouched", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const documents = testDb.db.collection("documents");
    const row = {
      applicationId: created.id,
      name: "cv.pdf",
      kind: "cv",
      size: 1234,
    };
    const { insertedId } = await documents.insertOne({ ...row });

    expect((await remove(app, created.id)).status).toBe(204);

    expect(await documents.countDocuments()).toBe(1);
    expect(await documents.findOne({ _id: insertedId })).toEqual({
      _id: insertedId,
      ...row,
    });
  });

  it("answers 404 NOT_FOUND on a second delete of the same id", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });

    expect((await remove(app, created.id)).status).toBe(204);

    await expectNotFound(await remove(app, created.id));
  });

  it("answers 404 for an unknown id and for a malformed id", async () => {
    const app = buildApp();

    await expectNotFound(await remove(app, "0123456789abcdef01234567"));
    await expectNotFound(await remove(app, "abc"));
  });

  it("answers 404 to PATCH status after the delete and never recreates the document", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    expect((await remove(app, created.id)).status).toBe(204);

    const res = await app.request(`/api/applications/${created.id}/status`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ status: "enviada" }),
    });

    await expectNotFound(res);
    expect(await testDb.db.collection("applications").countDocuments()).toBe(0);
  });
});
