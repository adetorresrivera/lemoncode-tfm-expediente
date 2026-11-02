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

function putInterview(
  app: Hono,
  id: string,
  interviewId: string,
  body: unknown,
  headers: Record<string, string> = JSON_HEADERS,
): Promise<Response> | Response {
  return app.request(`/api/applications/${id}/interviews/${interviewId}`, {
    method: "PUT",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deleteInterview(
  app: Hono,
  id: string,
  interviewId: string,
): Promise<Response> | Response {
  return app.request(`/api/applications/${id}/interviews/${interviewId}`, {
    method: "DELETE",
  });
}

async function addRounds(
  app: Hono,
  id: string,
  count: number,
): Promise<Application> {
  for (let index = 0; index < count; index += 1) {
    const res = await postInterview(app, id, TECNICA);
    expect(res.status).toBe(201);
  }
  return get(app, id);
}

const EDITED = {
  type: "manager",
  round: 5,
  scheduledAt: "2026-11-06T08:00:00.000Z",
  mode: "presencial",
  outcome: "superada",
  notes: "Bien",
};

describe("PUT /api/applications/:id/interviews/:interviewId", () => {
  it("replaces the fields of one round, keeps its id and the other rounds, and sets updatedAt", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 2);
    const first = before.interviews[0];
    const second = before.interviews[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    tick("2026-10-05T12:00:00.000Z");
    const res = await putInterview(app, created.id, second?.id ?? "", EDITED);

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews).toStrictEqual([
      first,
      { id: second?.id, ...EDITED },
    ]);
    expect(body.updatedAt).toBe("2026-10-05T12:00:00.000Z");
    expect(body.status).toBe(before.status);
    expect(body.statusHistory).toStrictEqual(before.statusHistory);
    expect(await get(app, created.id)).toStrictEqual(body);
  });

  it("clears notes and date with null", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await postInterview(app, created.id, {
      ...TECNICA,
      notes: "Algo",
      scheduledAt: "2026-11-05T09:30:00.000Z",
    });
    const stored = await get(app, created.id);
    const target = stored.interviews[0]?.id ?? "";

    const res = await putInterview(app, created.id, target, {
      ...TECNICA,
      round: 1,
      notes: null,
      scheduledAt: null,
    });

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews[0]?.notes).toBeNull();
    expect(body.interviews[0]?.scheduledAt).toBeNull();
  });

  it("keeps the stored round when the body has none", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 2);
    const second = before.interviews[1]?.id ?? "";

    const res = await putInterview(app, created.id, second, {
      type: "cultural",
      mode: "presencial",
    });

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews[1]).toStrictEqual({
      id: second,
      round: 2,
      type: "cultural",
      scheduledAt: null,
      mode: "presencial",
      notes: null,
      outcome: "pendiente",
    });
  });

  it("ignores an id in the body and stores operator-looking notes verbatim", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 1);
    const target = before.interviews[0]?.id ?? "";

    const res = await putInterview(app, created.id, target, {
      ...TECNICA,
      round: 1,
      id: "zzz",
      notes: "$title",
    });

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews[0]?.id).toBe(target);
    expect(body.interviews[0]?.notes).toBe("$title");
  });

  it("keeps status enviada and the history length on an application moved back to enviada", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await change(app, created.id, "enviada");
    await postInterview(app, created.id, TECNICA);
    await change(app, created.id, "enviada");
    const before = await get(app, created.id);
    expect(before.status).toBe("enviada");

    const res = await putInterview(
      app,
      created.id,
      before.interviews[0]?.id ?? "",
      { ...TECNICA, round: 1, outcome: "superada" },
    );

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.status).toBe("enviada");
    expect(body.statusHistory).toHaveLength(before.statusHistory.length);
  });

  it("answers 404 «Candidatura no encontrada» for an unknown or malformed application id", async () => {
    const app = buildApp();
    for (const id of [new ObjectId().toString(), "abc"]) {
      const res = await putInterview(app, id, "nope", {
        ...TECNICA,
        round: 1,
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toStrictEqual({
        error: { code: "NOT_FOUND", message: "Candidatura no encontrada" },
      });
    }
  });

  it("answers 404 «Ronda no encontrada» for an unknown or malformed round id", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await addRounds(app, created.id, 1);
    for (const interviewId of ["nope", new ObjectId().toString()]) {
      const res = await putInterview(app, created.id, interviewId, {
        ...TECNICA,
        round: 1,
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toStrictEqual({
        error: { code: "NOT_FOUND", message: "Ronda no encontrada" },
      });
    }
  });

  it.each([
    ["round 0", { type: "tecnica", mode: "online", round: 0 }],
    ["an unknown type", { type: "x", mode: "online", round: 1 }],
    ["no mode", { type: "tecnica", round: 1 }],
  ])("answers 400 and writes nothing for %s", async (_name, body) => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 1);

    tick("2026-10-05T12:00:00.000Z");
    const res = await putInterview(
      app,
      created.id,
      before.interviews[0]?.id ?? "",
      body,
    );

    expect(res.status).toBe(400);
    expect(await get(app, created.id)).toStrictEqual(before);
  });

  it("answers 400 for a text/plain body", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 1);

    const res = await putInterview(
      app,
      created.id,
      before.interviews[0]?.id ?? "",
      JSON.stringify({ ...TECNICA, round: 1 }),
      { "content-type": "text/plain" },
    );

    expect(res.status).toBe(400);
    expect(await get(app, created.id)).toStrictEqual(before);
  });

  it("leaves the same round values when the same PUT is sent twice and moves only updatedAt", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 1);
    const target = before.interviews[0]?.id ?? "";

    tick("2026-10-05T12:00:00.000Z");
    const first = applicationSchema.parse(
      await (await putInterview(app, created.id, target, EDITED)).json(),
    );
    tick("2026-10-06T12:00:00.000Z");
    const second = applicationSchema.parse(
      await (await putInterview(app, created.id, target, EDITED)).json(),
    );

    expect(second.interviews).toStrictEqual(first.interviews);
    expect(second.updatedAt).toBe("2026-10-06T12:00:00.000Z");
  });
});

describe("DELETE /api/applications/:id/interviews/:interviewId", () => {
  it("pulls one round, keeps the other numbers, answers 200 with the application and the next round is 4", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 3);
    const [one, two, three] = before.interviews;

    tick("2026-10-05T12:00:00.000Z");
    const res = await deleteInterview(app, created.id, two?.id ?? "");

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews).toStrictEqual([one, three]);
    expect(body.interviews.map((interview) => interview.round)).toStrictEqual([
      1, 3,
    ]);
    expect(body.updatedAt).toBe("2026-10-05T12:00:00.000Z");
    expect(await get(app, created.id)).toStrictEqual(body);

    const next = await postInterview(app, created.id, TECNICA);
    expect(next.status).toBe(201);
    const afterAdd = applicationSchema.parse(await next.json());
    expect(afterAdd.interviews.at(-1)?.round).toBe(4);
  });

  it("keeps status enviada and the history length on an application moved back to enviada", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    await change(app, created.id, "enviada");
    await postInterview(app, created.id, TECNICA);
    await change(app, created.id, "enviada");
    const before = await get(app, created.id);
    expect(before.status).toBe("enviada");

    const res = await deleteInterview(
      app,
      created.id,
      before.interviews[0]?.id ?? "",
    );

    expect(res.status).toBe(200);
    const body = applicationSchema.parse(await res.json());
    expect(body.interviews).toHaveLength(0);
    expect(body.status).toBe("enviada");
    expect(body.statusHistory).toHaveLength(before.statusHistory.length);
  });

  it("answers 404 «Ronda no encontrada» to a second DELETE and changes nothing", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 2);
    const target = before.interviews[0]?.id ?? "";
    expect((await deleteInterview(app, created.id, target)).status).toBe(200);
    const afterFirst = await get(app, created.id);

    tick("2026-10-09T12:00:00.000Z");
    const res = await deleteInterview(app, created.id, target);

    expect(res.status).toBe(404);
    expect(await res.json()).toStrictEqual({
      error: { code: "NOT_FOUND", message: "Ronda no encontrada" },
    });
    expect(await get(app, created.id)).toStrictEqual(afterFirst);
  });

  it("answers 404 «Candidatura no encontrada» for an unknown or malformed application id", async () => {
    const app = buildApp();
    for (const id of [new ObjectId().toString(), "abc"]) {
      const res = await deleteInterview(app, id, "nope");
      expect(res.status).toBe(404);
      expect(await res.json()).toStrictEqual({
        error: { code: "NOT_FOUND", message: "Candidatura no encontrada" },
      });
    }
  });

  it("does not bring a deleted round back with a later PUT", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 3);
    const target = before.interviews[1]?.id ?? "";
    await deleteInterview(app, created.id, target);

    const res = await putInterview(app, created.id, target, EDITED);

    expect(res.status).toBe(404);
    expect(await res.json()).toStrictEqual({
      error: { code: "NOT_FOUND", message: "Ronda no encontrada" },
    });
    expect((await get(app, created.id)).interviews).toHaveLength(2);
  });

  it("ends with the round deleted when a PUT and a DELETE run together", async () => {
    const app = buildApp();
    const created = await create(app, { title: "Dev", company: "Acme" });
    const before = await addRounds(app, created.id, 2);
    const target = before.interviews[0]?.id ?? "";

    const [put, del] = await Promise.all([
      putInterview(app, created.id, target, EDITED),
      deleteInterview(app, created.id, target),
    ]);

    expect(del.status).toBe(200);
    expect([200, 404]).toContain(put.status);
    const stored = await get(app, created.id);
    expect(stored.interviews.some((i) => i.id === target)).toBe(false);
  });
});
