import {
  applicationSchema,
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

  describe("rule 3 only fires from enviada", () => {
    it.each([
      "guardada",
      "en_entrevistas",
      "oferta_recibida",
      "aceptada",
      "rechazada",
      "descartada",
    ])("keeps status and history when the status is %s", async (status) => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      tick("2026-10-02T10:00:00.000Z");
      const before =
        status === "guardada" ? created : await change(app, created.id, status);

      tick("2026-10-05T08:00:00.000Z");
      const res = await postInterview(app, created.id, TECNICA);

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.status).toBe(status);
      expect(body.statusHistory).toStrictEqual(before.statusHistory);
      expect(body.interviews).toHaveLength(1);
      expect(body.updatedAt).toBe("2026-10-05T08:00:00.000Z");
    });

    it("adds no history entry for a second round while en_entrevistas and numbers it 2", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      await change(app, created.id, "enviada");
      await postInterview(app, created.id, TECNICA);

      tick("2026-10-06T08:00:00.000Z");
      const res = await postInterview(app, created.id, {
        type: "manager",
        mode: "presencial",
      });

      const body = applicationSchema.parse(await res.json());
      expect(body.status).toBe("en_entrevistas");
      expect(
        body.statusHistory.filter((entry) => entry.status === "en_entrevistas"),
      ).toHaveLength(1);
      expect(body.interviews.map((interview) => interview.round)).toStrictEqual(
        [1, 2],
      );
    });
  });

  describe("round numbers", () => {
    it("assigns max + 1 after rounds 1 and 3", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      await postInterview(app, created.id, { ...TECNICA, round: 1 });
      await postInterview(app, created.id, { ...TECNICA, round: 3 });

      const res = await postInterview(app, created.id, TECNICA);

      const body = applicationSchema.parse(await res.json());
      expect(body.interviews.map((interview) => interview.round)).toStrictEqual(
        [1, 3, 4],
      );
    });

    it("stores a round equal to an existing one (repeated numbers are allowed)", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      await postInterview(app, created.id, { ...TECNICA, round: 1 });

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        round: 1,
      });

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews.map((interview) => interview.round)).toStrictEqual(
        [1, 1],
      );
    });

    it.each([
      ["0", 0],
      ["1.5", 1.5],
      ['"2"', "2"],
    ])(
      "rejects round %s with 400 and writes nothing",
      async (_label, value) => {
        const app = buildApp();
        const created = await create(app, { title: "Dev", company: "Acme" });

        const res = await postInterview(app, created.id, {
          ...TECNICA,
          round: value,
        });

        expect(res.status).toBe(400);
        expect(
          ((await res.json()) as { error: { code: string } }).error.code,
        ).toBe("VALIDATION_ERROR");
        expect((await get(app, created.id)).interviews).toStrictEqual([]);
      },
    );

    it("keeps the assigned number inside the contract when the highest stored round is MAX_SAFE_INTEGER", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      await testDb.db.collection("applications").updateOne(
        { _id: new ObjectId(created.id) },
        {
          $set: {
            interviews: [
              {
                id: "stored",
                round: Number.MAX_SAFE_INTEGER,
                type: "tecnica",
                scheduledAt: null,
                mode: "online",
                notes: null,
                outcome: "pendiente",
              },
            ],
          },
        },
      );

      const res = await postInterview(app, created.id, TECNICA);

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews.map((interview) => interview.round)).toStrictEqual(
        [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      );
    });

    it("gives round 1 and a one-element array to a document stored without interviews", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      await testDb.db
        .collection("applications")
        .updateOne(
          { _id: new ObjectId(created.id) },
          { $unset: { interviews: "" } },
        );

      const res = await postInterview(app, created.id, TECNICA);

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews).toHaveLength(1);
      expect(body.interviews[0]?.round).toBe(1);
    });
  });

  describe("input boundaries", () => {
    it("stores notes of exactly 5,000 characters after trim", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });
      const notes = "n".repeat(5000);

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        notes: `  ${notes}  `,
      });

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews[0]?.notes).toHaveLength(5000);
    });

    it("rejects notes of 5,001 characters", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        notes: "n".repeat(5001),
      });

      expect(res.status).toBe(400);
      expect((await get(app, created.id)).interviews).toStrictEqual([]);
    });

    it.each([
      ["no type", { mode: "online" }],
      ["no mode", { type: "tecnica" }],
      ["an unknown mode", { type: "tecnica", mode: "zoom" }],
    ])("answers 400 for %s", async (_label, body) => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const res = await postInterview(app, created.id, body);

      expect(res.status).toBe(400);
      expect((await get(app, created.id)).interviews).toStrictEqual([]);
    });

    it("answers 400 to a text/plain body and to malformed JSON", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const plain = await postInterview(
        app,
        created.id,
        JSON.stringify(TECNICA),
        { "content-type": "text/plain" },
      );
      const malformed = await postInterview(app, created.id, "{not json");

      expect(plain.status).toBe(400);
      expect(malformed.status).toBe(400);
      expect((await get(app, created.id)).interviews).toStrictEqual([]);
    });

    it("answers 404 «Candidatura no encontrada» for an unknown or malformed id and writes nothing", async () => {
      const app = buildApp();

      const unknown = await postInterview(
        app,
        new ObjectId().toString(),
        TECNICA,
      );
      const malformed = await postInterview(app, "abc", TECNICA);

      for (const res of [unknown, malformed]) {
        expect(res.status).toBe(404);
        expect(await res.json()).toStrictEqual({
          error: { code: "NOT_FOUND", message: "Candidatura no encontrada" },
        });
      }
      expect(await testDb.db.collection("applications").countDocuments()).toBe(
        0,
      );
    });
  });

  describe("scheduledAt", () => {
    it("returns an ISO UTC instant with millisecond precision", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        scheduledAt: "2026-11-05T09:30:00Z",
      });

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews[0]?.scheduledAt).toBe("2026-11-05T09:30:00.000Z");
    });

    it.each(["2026-11-05T10:30", "2026-11-05T10:30:00+01:00"])(
      "rejects %s with 400",
      async (scheduledAt) => {
        const app = buildApp();
        const created = await create(app, { title: "Dev", company: "Acme" });

        const res = await postInterview(app, created.id, {
          ...TECNICA,
          scheduledAt,
        });

        expect(res.status).toBe(400);
        expect((await get(app, created.id)).interviews).toStrictEqual([]);
      },
    );
  });

  describe("what the client cannot control", () => {
    it("stores notes that start with $ verbatim", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        notes: "$title",
      });

      const body = applicationSchema.parse(await res.json());
      expect(body.interviews[0]?.notes).toBe("$title");
      expect((await get(app, created.id)).interviews[0]?.notes).toBe("$title");
    });

    it("ignores id, status, statusHistory and interviews sent in the body", async () => {
      const app = buildApp();
      const created = await create(app, { title: "Dev", company: "Acme" });

      const res = await postInterview(app, created.id, {
        ...TECNICA,
        id: "x",
        status: "aceptada",
        statusHistory: [],
        interviews: [],
      });

      expect(res.status).toBe(201);
      const body = applicationSchema.parse(await res.json());
      expect(body.interviews).toHaveLength(1);
      expect(body.interviews[0]?.id).toMatch(/^[0-9a-f]{24}$/);
      expect(body.status).toBe("guardada");
      expect(body.statusHistory).toStrictEqual(created.statusHistory);
    });
  });

  it("stores rounds 1 and 2 and one history entry for two concurrent POSTs on an enviada application", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await change(app, created.id, "enviada");

    const [first, second] = await Promise.all([
      postInterview(app, created.id, TECNICA),
      postInterview(app, created.id, { type: "cultural", mode: "online" }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const stored = await get(app, created.id);
    expect(
      stored.interviews.map((interview) => interview.round).sort(),
    ).toStrictEqual([1, 2]);
    expect(
      stored.statusHistory.filter((entry) => entry.status === "en_entrevistas"),
    ).toHaveLength(1);
  });
});
