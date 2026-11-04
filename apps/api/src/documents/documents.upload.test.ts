import { documentSchema } from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp, type AppDeps } from "../app.js";
import {
  TEST_BUCKET,
  pdfBytes,
  readStream,
  uploadForm,
  useTestStorage,
  type TestStorage,
} from "../test/documents.js";
import { useTestDb, type TestDb } from "../test/mongo.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

const CLOCK = new Date(Date.UTC(2026, 10, 3, 9, 30));

let testDb: TestDb;
let testStorage: TestStorage;

beforeAll(async () => {
  testDb = await useTestDb();
  testStorage = await useTestStorage();
});

afterAll(async () => {
  await testStorage.cleanup();
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
});

describe("POST /api/documents (tracer: real Silo test bucket and real Mongo)", () => {
  it("stores a PDF in the bucket under the slugged key and its metadata in Mongo", async () => {
    expect(TEST_BUCKET).toBe("tfm-assets-test");
    const app = createApp({
      ...allUp,
      db: testDb.db,
      storage: testStorage.storage,
      now: () => CLOCK,
    });
    const bytes = pdfBytes(2048);

    const res = await app.request("/api/documents", {
      method: "POST",
      body: uploadForm(
        { type: "cv", name: "CV Frontend", version: "v3" },
        { bytes, name: "CV Ñandú (v3).pdf", type: "application/pdf" },
      ),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const doc = documentSchema.parse(body);
    expect(doc.id).toMatch(/^[0-9a-f]{24}$/);
    expect(doc).toEqual({
      id: doc.id,
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "CV Ñandú (v3).pdf",
      s3Key: `documents/${doc.id}/cv-nandu-v3.pdf`,
      mimeType: "application/pdf",
      size: 2048,
      createdAt: CLOCK.toISOString(),
    });
    expect(body).not.toHaveProperty("_id");

    const stored = await testDb.db
      .collection("documents")
      .findOne({ _id: new ObjectId(doc.id) });
    expect(stored).toMatchObject({
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "CV Ñandú (v3).pdf",
      s3Key: doc.s3Key,
      mimeType: "application/pdf",
      size: 2048,
      createdAt: CLOCK,
    });

    const object = await testStorage.storage.get(doc.s3Key);
    expect(object).not.toBeNull();
    expect(await readStream(object!.stream)).toEqual(bytes);
  });
});
