import { readFileSync } from "node:fs";
import type { S3Client } from "@aws-sdk/client-s3";
import { ObjectId, type Db } from "mongodb";
import { createApplicationsRepository } from "../../applications/applications.repository.js";
import { createApplicationsService } from "../../applications/applications.service.js";
import { createDocumentsRepository } from "../../documents/documents.repository.js";
import { createDocumentsService } from "../../documents/documents.service.js";
import { createDocumentStorage } from "../../storage/s3.js";
import { buildSeedPlan, type SeedDocumentKey } from "./seed.plan.js";

export interface SeedDeps {
  db: Db;
  s3: S3Client;
  bucket: string;
  /** Receives counts only: never offer text, file names or keys. */
  log: (line: string) => void;
  now?: () => Date;
}

export interface SeedSummary {
  applications: number;
  documents: number;
  removedApplications: number;
  removedDocuments: number;
}

// The mark is storage-only: it is written through the untyped collection and never added to
// ApplicationDoc, DocumentDoc or the contracts, so no mapper can leak it.
async function markSeed(
  db: Db,
  collection: "applications" | "documents",
  id: string,
): Promise<void> {
  await db
    .collection(collection)
    .updateOne({ _id: new ObjectId(id) }, { $set: { seed: true } });
}

// Removes only what a previous seed run created; the user's own records are never touched.
async function clearSeedData(
  db: Db,
  s3: S3Client,
  bucket: string,
): Promise<{ applications: number; documents: number }> {
  const storage = createDocumentStorage(s3, bucket);
  const applications = await db
    .collection("applications")
    .deleteMany({ seed: true });
  const seeded = await db
    .collection("documents")
    .find({ seed: true }, { projection: { s3Key: 1 } })
    .toArray();
  for (const doc of seeded) {
    if (typeof doc["s3Key"] === "string") await storage.delete(doc["s3Key"]);
  }
  const documents = await db.collection("documents").deleteMany({ seed: true });
  return {
    applications: applications.deletedCount,
    documents: documents.deletedCount,
  };
}

export async function runSeed(deps: SeedDeps): Promise<SeedSummary> {
  const { db, s3, bucket, log } = deps;

  const removed = await clearSeedData(db, s3, bucket);
  log(
    `Seed anterior eliminado: ${removed.applications} candidaturas y ${removed.documents} documentos.`,
  );

  const realNow = deps.now?.() ?? new Date();
  const plan = buildSeedPlan(realNow);

  // Both services stamp their writes with this clock, so histories carry the planned dates and
  // every domain rule runs exactly as for a user.
  let current = realNow;
  const clock = {
    set: (date: Date): void => {
      current = date;
    },
    now: (): Date => current,
  };

  const documentsRepository = createDocumentsRepository(db);
  const documentsService = createDocumentsService(
    documentsRepository,
    createDocumentStorage(s3, bucket),
    clock.now,
  );
  const applicationsService = createApplicationsService(
    createApplicationsRepository(db),
    (ids) => documentsRepository.findTypes(ids),
    clock.now,
  );

  const documentIds = new Map<SeedDocumentKey, string>();
  for (const seedDocument of plan.documents) {
    clock.set(seedDocument.at);
    const buffer = readFileSync(
      new URL(`../assets/${seedDocument.asset}`, import.meta.url),
    );
    const uploaded = await documentsService.upload(seedDocument.input, {
      fileName: seedDocument.fileName,
      bytes: new Uint8Array(buffer),
    });
    await markSeed(db, "documents", uploaded.id);
    documentIds.set(seedDocument.key, uploaded.id);
  }

  const idFor = (key: SeedDocumentKey | null): string | null =>
    key === null ? null : (documentIds.get(key) ?? null);

  for (const seedApplication of plan.applications) {
    let applicationId: string | null = null;
    for (const step of seedApplication.timeline) {
      clock.set(step.at);
      if (step.op === "create") {
        const created = await applicationsService.create({
          ...seedApplication.input,
          cvDocumentId: idFor(seedApplication.cv),
          coverLetterDocumentId: idFor(seedApplication.coverLetter),
        });
        await markSeed(db, "applications", created.id);
        applicationId = created.id;
      } else if (applicationId !== null) {
        const id = new ObjectId(applicationId);
        if (step.op === "status") {
          await applicationsService.changeStatus(id, step.status);
        } else {
          await applicationsService.addInterview(id, step.interview);
        }
      }
    }
  }

  return {
    applications: plan.applications.length,
    documents: plan.documents.length,
    removedApplications: removed.applications,
    removedDocuments: removed.documents,
  };
}
