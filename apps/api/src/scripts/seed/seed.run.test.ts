import type { S3Client } from "@aws-sdk/client-s3";
import { ObjectId } from "mongodb";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createApplicationsRepository } from "../../applications/applications.repository.js";
import { createApplicationsService } from "../../applications/applications.service.js";
import { createDocumentsRepository } from "../../documents/documents.repository.js";
import { createDocumentsService } from "../../documents/documents.service.js";
import {
  createDocumentStorage,
  createS3Client,
  ensureBucket,
  type DocumentStorage,
} from "../../storage/s3.js";
import { pdfBytes, readStream, TEST_BUCKET } from "../../test/documents.js";
import { useTestDb, type TestDb } from "../../test/mongo.js";
import { buildSeedPlan } from "./seed.plan.js";
import { runSeed } from "./seed.run.js";

const NOW = new Date(Date.UTC(2026, 10, 6, 10, 0, 0));
const PLAN = buildSeedPlan(NOW);

let testDb: TestDb;
let s3: S3Client;
let storage: DocumentStorage;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the seed test`);
  return value;
}

beforeAll(async () => {
  testDb = await useTestDb();
  s3 = createS3Client({
    S3_ENDPOINT: requireEnv("S3_ENDPOINT"),
    S3_REGION: process.env["S3_REGION"] ?? "us-east-1",
    S3_FORCE_PATH_STYLE: process.env["S3_FORCE_PATH_STYLE"] !== "false",
    S3_ACCESS_KEY: requireEnv("S3_ACCESS_KEY"),
    S3_SECRET_KEY: requireEnv("S3_SECRET_KEY"),
  });
  await ensureBucket(s3, TEST_BUCKET);
  storage = createDocumentStorage(s3, TEST_BUCKET);
});

// Removes every object of the documents left in tfm_test, then the records.
afterEach(async () => {
  const docs = await testDb.db
    .collection("documents")
    .find({}, { projection: { s3Key: 1 } })
    .toArray();
  for (const doc of docs) {
    if (typeof doc["s3Key"] === "string") await storage.delete(doc["s3Key"]);
  }
  await testDb.reset();
});

afterAll(async () => {
  s3.destroy();
  await testDb.close();
});

function seed(): ReturnType<typeof runSeed> {
  return runSeed({
    db: testDb.db,
    s3,
    bucket: TEST_BUCKET,
    log: () => undefined,
    now: () => NOW,
  });
}

function services(): {
  documents: ReturnType<typeof createDocumentsService>;
  applications: ReturnType<typeof createApplicationsService>;
} {
  const documentsRepository = createDocumentsRepository(testDb.db);
  return {
    documents: createDocumentsService(documentsRepository, storage),
    applications: createApplicationsService(
      createApplicationsRepository(testDb.db),
      (ids) => documentsRepository.findTypes(ids),
    ),
  };
}

async function seededCounts(): Promise<{
  applications: number;
  documents: number;
}> {
  return {
    applications: await testDb.db
      .collection("applications")
      .countDocuments({ seed: true }),
    documents: await testDb.db
      .collection("documents")
      .countDocuments({ seed: true }),
  };
}

describe("runSeed", () => {
  it("creates the planned records, marked, linked and downloadable", async () => {
    const summary = await seed();

    expect(summary.applications).toBe(PLAN.applications.length);
    expect(summary.documents).toBe(PLAN.documents.length);
    expect(await seededCounts()).toEqual({
      applications: PLAN.applications.length,
      documents: PLAN.documents.length,
    });
    expect(await testDb.db.collection("applications").countDocuments()).toBe(
      PLAN.applications.length,
    );

    const application = await testDb.db
      .collection("applications")
      .findOne({ seed: true });
    const cvId = application?.["cvDocumentId"];
    expect(typeof cvId).toBe("string");
    const document = await testDb.db
      .collection("documents")
      .findOne({ _id: new ObjectId(String(cvId)), seed: true });
    expect(document?.["type"]).toBe("cv");

    const opened = await services().documents.open(new ObjectId(String(cvId)));
    const bytes = await readStream(opened.stream);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("walks the history through the services with the injected clock", async () => {
    await seed();
    const doc = await testDb.db
      .collection("applications")
      .findOne({ seed: true });
    const history = doc?.["statusHistory"] as { status: string; at: Date }[];
    expect(history[0]?.status).toBe("guardada");
    expect(history[0]?.at.getTime()).toBeLessThan(NOW.getTime());
    expect(history.at(-1)?.status).toBe(doc?.["status"]);
    for (let i = 1; i < history.length; i++) {
      expect(history[i]!.at.getTime()).toBeGreaterThanOrEqual(
        history[i - 1]!.at.getTime(),
      );
    }
  });

  it("replaces the seeded records on a second run", async () => {
    await seed();
    const firstKeys = (
      await testDb.db
        .collection("documents")
        .find({ seed: true }, { projection: { s3Key: 1 } })
        .toArray()
    ).map((doc) => String(doc["s3Key"]));
    expect(firstKeys.length).toBeGreaterThan(0);

    const second = await seed();

    expect(second.removedApplications).toBe(PLAN.applications.length);
    expect(second.removedDocuments).toBe(PLAN.documents.length);
    expect(await seededCounts()).toEqual({
      applications: PLAN.applications.length,
      documents: PLAN.documents.length,
    });
    for (const key of firstKeys) {
      expect(await storage.get(key)).toBeNull();
    }
  });

  it("keeps the user's own application and document across two runs", async () => {
    const { documents, applications } = services();
    const ownDocument = await documents.upload(
      { type: "cv", name: "Mi CV", version: "v1" },
      { fileName: "mi-cv.pdf", bytes: pdfBytes() },
    );
    const ownApplication = await applications.create({
      title: "Puesto propio",
      company: "Empresa propia",
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      tags: [],
      sourceUrl: null,
      offerText: null,
      appliedAt: null,
      notes: null,
      cvDocumentId: ownDocument.id,
      coverLetterDocumentId: null,
      status: "guardada",
    });

    await seed();
    await seed();

    const keptApplication = await applications.get(
      new ObjectId(ownApplication.id),
    );
    expect(keptApplication).toEqual(ownApplication);
    const keptDocument = await documents.get(new ObjectId(ownDocument.id));
    expect(keptDocument).toEqual(ownDocument);
    expect(
      (await documents.open(new ObjectId(ownDocument.id))).document.id,
    ).toBe(ownDocument.id);
  });

  it("never shows the seed mark through the API", async () => {
    await seed();
    const app = createApp({
      pingMongo: async () => true,
      pingS3: async () => true,
      pingLlm: async () => true,
      db: testDb.db,
      storage,
    });

    for (const path of ["/api/applications", "/api/documents"]) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(2);
      expect(text).not.toContain('"seed"');
    }
  });
});
