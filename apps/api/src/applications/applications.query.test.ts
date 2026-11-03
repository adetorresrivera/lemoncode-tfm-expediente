import {
  applicationQuerySchema,
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
import { queryInput } from "../http/query-input.js";
import { useTestDb, type TestDb } from "../test/mongo.js";
import {
  buildApplicationsFilter,
  buildApplicationsSort,
  escapeRegex,
} from "./applications.query.js";

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

// Each fixture is created one minute after the previous one so updatedAt order is known.
let minute = 0;
async function create(
  app: Hono,
  input: Partial<ApplicationInput> & { title: string; company: string },
  advance = true,
): Promise<Application> {
  if (advance) minute += 1;
  instant = new Date(Date.UTC(2026, 9, 30, 9, minute));
  const res = await app.request("/api/applications", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
  expect(res.status).toBe(201);
  return applicationSchema.parse(await res.json());
}

async function list(app: Hono, query = ""): Promise<Application[]> {
  const res = await app.request(`/api/applications${query}`);
  expect(res.status).toBe(200);
  return applicationSchema.array().parse(await res.json());
}

async function titles(app: Hono, query = ""): Promise<string[]> {
  return (await list(app, query)).map((a) => a.title);
}

let ids: Record<"A" | "B" | "C" | "D" | "E", string>;

// A and B share a stack tag prefix; C has regex metacharacters; D has non-ASCII tags;
// E is inserted directly with the appliedAt field absent.
async function seed(app: Hono): Promise<void> {
  const a = await create(app, {
    title: "Frontend React",
    company: "Acme",
    status: "enviada",
    appliedAt: "2026-05-10T00:00:00.000Z",
    workMode: "remoto",
    seniority: "senior",
    tags: [
      { label: "React", group: "stack" },
      { label: "TypeScript", group: "stack" },
    ],
  });
  const b = await create(app, {
    title: "React Native Dev",
    company: "ACME Corp",
    status: "en_entrevistas",
    workMode: "hibrido",
    seniority: "mid",
    tags: [{ label: "React Native", group: "stack" }],
  });
  const c = await create(app, {
    title: "Dev C++ (test)",
    company: "Beta",
    status: "guardada",
    appliedAt: null,
    workMode: "remoto",
    seniority: "junior",
    tags: [{ label: "React", group: "nice_to_have" }],
  });
  const d = await create(app, {
    title: "Dev D",
    company: "Delta",
    status: "enviada",
    appliedAt: "2026-03-01T00:00:00.000Z",
    tags: [
      { label: "Éxito", group: "stack" },
      { label: "Ñandú", group: "stack" },
    ],
  });
  minute += 1;
  const missing = await testDb.db.collection("applications").insertOne({
    title: "Dev E",
    company: "Épsilon",
    location: null,
    workMode: null,
    seniority: null,
    contractType: null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    sourceUrl: null,
    offerText: null,
    notes: null,
    cvDocumentId: null,
    coverLetterDocumentId: null,
    tags: [],
    status: "guardada",
    statusHistory: [],
    interviews: [],
    createdAt: new Date(Date.UTC(2026, 9, 30, 9, minute)),
    updatedAt: new Date(Date.UTC(2026, 9, 30, 9, minute)),
    ownerId: null,
  });
  ids = {
    A: a.id,
    B: b.id,
    C: c.id,
    D: d.id,
    E: missing.insertedId.toHexString(),
  };
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

describe("escapeRegex", () => {
  it("escapes every regex metacharacter", () => {
    expect(escapeRegex("c++ (test) .*")).toBe("c\\+\\+ \\(test\\) \\.\\*");
  });

  it("leaves plain and non-ASCII text untouched", () => {
    expect(escapeRegex("Ñandú acme")).toBe("Ñandú acme");
  });
});

describe("buildApplicationsFilter", () => {
  it("returns an empty filter for an empty query", () => {
    expect(buildApplicationsFilter(applicationQuerySchema.parse({}))).toEqual(
      {},
    );
  });

  it("adds no $in or $all for empty arrays", () => {
    const filter = buildApplicationsFilter(
      applicationQuerySchema.parse({ status: [], tags: [] }),
    );
    expect(filter).toEqual({});
  });

  it("builds the tag filter on the normalized key and the stack group", () => {
    const filter = buildApplicationsFilter(
      applicationQuerySchema.parse({ tags: ["  ÉXITO ", "React"] }),
    );
    expect(filter).toEqual({
      tags: {
        $all: [
          { $elemMatch: { key: "éxito", group: "stack" } },
          { $elemMatch: { key: "react", group: "stack" } },
        ],
      },
    });
  });
});

describe("buildApplicationsSort", () => {
  it("is deterministic with _id as last tiebreaker", () => {
    expect(buildApplicationsSort("updatedAt")).toEqual({
      updatedAt: -1,
      _id: -1,
    });
    expect(buildApplicationsSort("appliedAt")).toEqual({
      appliedAt: -1,
      updatedAt: -1,
      _id: -1,
    });
  });
});

describe("queryInput", () => {
  it("unwraps single values and keeps repeated keys as arrays", () => {
    expect(queryInput({ q: ["acme"], tags: ["a", "b"] })).toEqual({
      q: "acme",
      tags: ["a", "b"],
    });
  });
});

describe("GET /api/applications filters", () => {
  it("returns every application when there is no filter", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app)).toHaveLength(5);
  });

  it("filters one stack tag, case-insensitively and without partial matches", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?tags=react")).toEqual(["Frontend React"]);
  });

  it("ANDs several stack tags", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?tags=react&tags=typescript")).toEqual([
      "Frontend React",
    ]);
    expect(await titles(app, "?tags=react&tags=zod")).toEqual([]);
  });

  it("matches tags through the shared normalization on non-ASCII letters", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, `?tags=${encodeURIComponent("éxito")}`)).toEqual([
      "Dev D",
    ]);
    expect(await titles(app, `?tags=${encodeURIComponent("ñandú")}`)).toEqual([
      "Dev D",
    ]);
  });

  it("matches q as a case-insensitive substring of title or company", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?q=acme")).toEqual([
      "React Native Dev",
      "Frontend React",
    ]);
    expect(await titles(app, "?q=NATIVE")).toEqual(["React Native Dev"]);
  });

  it("matches q on Unicode letters regardless of case", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, `?q=${encodeURIComponent("ÉPSILON")}`)).toEqual([
      "Dev E",
    ]);
  });

  it("treats regex metacharacters in q literally", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, `?q=${encodeURIComponent("c++")}`)).toEqual([
      "Dev C++ (test)",
    ]);
    expect(await titles(app, `?q=${encodeURIComponent("(test)")}`)).toEqual([
      "Dev C++ (test)",
    ]);
    expect(await titles(app, `?q=${encodeURIComponent(".*")}`)).toEqual([]);
  });

  it("answers a catastrophic-backtracking pattern in q promptly", async () => {
    const app = buildApp();
    await seed(app);
    const started = Date.now();
    const res = await app.request(
      `/api/applications?q=${encodeURIComponent("(a+)+$")}`,
    );
    expect(res.status).toBe(200);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("filters by several statuses with $in", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?status=enviada&status=guardada")).toEqual([
      "Dev E",
      "Dev D",
      "Dev C++ (test)",
      "Frontend React",
    ]);
  });

  it("filters by work mode and seniority exactly", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?workMode=remoto")).toEqual([
      "Dev C++ (test)",
      "Frontend React",
    ]);
    expect(await titles(app, "?seniority=senior")).toEqual(["Frontend React"]);
  });

  it("intersects combined filters", async () => {
    const app = buildApp();
    await seed(app);
    expect(
      await titles(app, "?workMode=remoto&status=enviada&q=front&tags=react"),
    ).toEqual(["Frontend React"]);
    expect(await titles(app, "?workMode=hibrido&status=enviada")).toEqual([]);
  });

  it("does not change the relative order of results when filtering", async () => {
    const app = buildApp();
    await seed(app);
    const all = await titles(app);
    const filtered = await titles(app, "?status=enviada&status=guardada");
    expect(filtered).toEqual(all.filter((t) => filtered.includes(t)));
  });
});

describe("GET /api/applications sort", () => {
  it("sorts by updatedAt descending by default", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app)).toEqual([
      "Dev E",
      "Dev D",
      "Dev C++ (test)",
      "React Native Dev",
      "Frontend React",
    ]);
  });

  it("puts null and missing appliedAt after every dated application", async () => {
    const app = buildApp();
    await seed(app);
    expect(await titles(app, "?sort=appliedAt")).toEqual([
      "Frontend React",
      "Dev D",
      "Dev E",
      "Dev C++ (test)",
      "React Native Dev",
    ]);
  });

  it("breaks ties on updatedAt then _id descending", async () => {
    const app = buildApp();
    const first = await create(app, { title: "Tie 1", company: "X" });
    const second = await create(app, { title: "Tie 2", company: "X" }, false);
    const third = await create(app, { title: "Tie 3", company: "X" }, false);
    const expected = [first.id, second.id, third.id].sort().reverse();
    expect((await list(app)).map((a) => a.id)).toEqual(expected);
    expect((await list(app, "?sort=appliedAt")).map((a) => a.id)).toEqual(
      expected,
    );
  });

  it("is read-only: the same query twice gives the same ids and touches no updatedAt", async () => {
    const app = buildApp();
    await seed(app);
    const before = await list(app, "?sort=appliedAt&status=enviada");
    const again = await list(app, "?sort=appliedAt&status=enviada");
    expect(again.map((a) => a.id)).toEqual(before.map((a) => a.id));
    const after = await list(app);
    for (const item of before) {
      expect(after.find((a) => a.id === item.id)?.updatedAt).toBe(
        item.updatedAt,
      );
    }
    expect(ids.A).toBeDefined();
  });
});

describe("GET /api/applications hostile queries", () => {
  it("answers 400 VALIDATION_ERROR for an unknown status", async () => {
    const app = buildApp();
    await seed(app);
    const res = await app.request("/api/applications?status=foo");
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("answers 400 for q longer than 100 characters", async () => {
    const res = await buildApp().request(
      `/api/applications?q=${"a".repeat(101)}`,
    );
    expect(res.status).toBe(400);
  });

  it("answers 400 for more than 20 tags", async () => {
    const query = Array.from({ length: 21 }, (_, i) => `tags=t${i}`).join("&");
    const res = await buildApp().request(`/api/applications?${query}`);
    expect(res.status).toBe(400);
  });

  it("answers 400 for a tag longer than 40 characters", async () => {
    const res = await buildApp().request(
      `/api/applications?tags=${"a".repeat(41)}`,
    );
    expect(res.status).toBe(400);
  });

  it("ignores operator-shaped keys so they never reach Mongo", async () => {
    const app = buildApp();
    await seed(app);
    const res = await app.request(
      `/api/applications?${encodeURIComponent("status[$ne]")}=x&__proto__=1`,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(5);
  });
});
