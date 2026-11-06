import { readFileSync } from "node:fs";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type S3Client,
} from "@aws-sdk/client-s3";
import { ObjectId, type Db } from "mongodb";
import { createApplicationsRepository } from "../../applications/applications.repository.js";
import { createApplicationsService } from "../../applications/applications.service.js";
import { createDocumentsRepository } from "../../documents/documents.repository.js";
import { createDocumentsService } from "../../documents/documents.service.js";
import {
  createDocumentStorage,
  type DocumentStorage,
} from "../../storage/s3.js";
import { buildSeedPlan, type SeedDocumentKey } from "./seed.plan.js";

export interface SeedDeps {
  db: Db;
  s3: S3Client;
  bucket: string;
  /** Wipe the whole database and bucket before seeding (never the default). */
  reset: boolean;
  /** Receives counts only: never offer text, file names or keys. */
  log: (line: string) => void;
  now?: () => Date;
  /** Defaults to the real bucket adapter; tests inject a failing one. */
  storage?: DocumentStorage;
}

export interface SeedSummary {
  applications: number;
  documents: number;
  removedApplications: number;
  removedDocuments: number;
}

/** A rejected command line: the caller prints the message and exits before connecting to anything. */
export class SeedUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedUsageError";
  }
}

const USAGE = "Uso: npm run seed [-- --reset]";

// Strict on purpose: a typo must never run a seed the presenter did not ask for.
export function parseSeedArgs(argv: readonly string[]): { reset: boolean } {
  let reset = false;
  for (const arg of argv) {
    if (arg === "--reset") {
      reset = true;
    } else {
      throw new SeedUsageError(`Opción desconocida: ${arg}. ${USAGE}`);
    }
  }
  return { reset };
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

async function listBucketKeys(s3: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key !== undefined) keys.push(object.Key);
    }
    token = page.IsTruncated === true ? page.NextContinuationToken : undefined;
  } while (token !== undefined);
  return keys;
}

const DELETE_BATCH = 1000;

async function deleteKeys(
  s3: S3Client,
  bucket: string,
  keys: readonly string[],
): Promise<void> {
  for (let start = 0; start < keys.length; start += DELETE_BATCH) {
    const batch = keys.slice(start, start + DELETE_BATCH);
    const out = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if ((out.Errors?.length ?? 0) > 0) {
      throw new Error(
        `No se pudieron borrar ${out.Errors?.length ?? 0} objetos del bucket`,
      );
    }
  }
}

// `--reset`: says what it is about to delete, then deletes everything the app owns.
async function wipeEverything(deps: SeedDeps): Promise<{
  applications: number;
  documents: number;
}> {
  const { db, s3, bucket, log } = deps;
  const applications = await db.collection("applications").countDocuments();
  const documents = await db.collection("documents").countDocuments();
  const keys = await listBucketKeys(s3, bucket);
  log(
    `Borrando todo en ${db.databaseName} / ${bucket}: ${applications} candidaturas, ${documents} documentos, ${keys.length} objetos.`,
  );
  await db.collection("applications").deleteMany({});
  await db.collection("documents").deleteMany({});
  await deleteKeys(s3, bucket, keys);
  return { applications, documents };
}

// Removes only what a previous seed run created; the user's own records are never touched. A seed
// document that a user application links is kept and turned into a user document (rule 4 of
// docs/DOMAIN.md: a linked document is never deleted).
async function clearSeedData(
  deps: SeedDeps,
  storage: DocumentStorage,
): Promise<{ applications: number; documents: number }> {
  const { db, log } = deps;
  const applications = await db
    .collection("applications")
    .deleteMany({ seed: true });

  const seeded = await db
    .collection("documents")
    .find({ seed: true }, { projection: { s3Key: 1 } })
    .toArray();
  const seededIds = seeded.map((doc) => String(doc._id));
  const linkedByUser = await db
    .collection("applications")
    .find(
      {
        seed: { $ne: true },
        $or: [
          { cvDocumentId: { $in: seededIds } },
          { coverLetterDocumentId: { $in: seededIds } },
        ],
      },
      { projection: { cvDocumentId: 1, coverLetterDocumentId: 1 } },
    )
    .toArray();
  const keep = new Set<string>();
  for (const application of linkedByUser) {
    for (const id of [
      application["cvDocumentId"],
      application["coverLetterDocumentId"],
    ]) {
      if (typeof id === "string") keep.add(id);
    }
  }

  let removedDocuments = 0;
  for (const doc of seeded) {
    if (keep.has(String(doc._id))) {
      await db
        .collection("documents")
        .updateOne({ _id: doc._id }, { $unset: { seed: "" } });
      continue;
    }
    if (typeof doc["s3Key"] === "string") await storage.delete(doc["s3Key"]);
    await db.collection("documents").deleteOne({ _id: doc._id });
    removedDocuments += 1;
  }
  const kept = seeded.length - removedDocuments;
  if (kept > 0) {
    log(
      `${kept} documentos de demo quedan en tu biblioteca porque los usa una candidatura tuya.`,
    );
  }
  return {
    applications: applications.deletedCount,
    documents: removedDocuments,
  };
}

export async function runSeed(deps: SeedDeps): Promise<SeedSummary> {
  const { db, s3, bucket, log } = deps;
  const storage = deps.storage ?? createDocumentStorage(s3, bucket);

  const removed = deps.reset
    ? await wipeEverything(deps)
    : await clearSeedData(deps, storage);
  if (!deps.reset) {
    log(
      `Seed anterior eliminado: ${removed.applications} candidaturas y ${removed.documents} documentos.`,
    );
  }

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
    storage,
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
