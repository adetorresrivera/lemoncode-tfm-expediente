// Loads the demo data (one CV and one application in this plan) into Mongo and Silo through the same
// services a user goes through. Idempotent: a run replaces only the records it created before.
// Run with `npm run seed` (needs `npm run build` first) or, in the image,
// `docker compose exec app npm run seed`. Not part of `npm run test`.
import { loadConfig, type Config } from "../config.js";
import { connectMongo } from "../db/mongo.js";
import { createS3Client, ensureBucket } from "../storage/s3.js";
import { runSeed } from "./seed/seed.run.js";

let config: Config;
try {
  // The seed never calls the LLM, so the provider variables are not required.
  config = loadConfig({ ...process.env, LLM_PROVIDER: "mock" });
} catch (err) {
  console.error(err instanceof Error ? err.message : "Invalid environment");
  process.exit(1);
}

try {
  const { client, db } = await connectMongo(config.MONGO_URL);
  const s3 = createS3Client(config);
  try {
    await ensureBucket(s3, config.S3_BUCKET);
    const summary = await runSeed({
      db,
      s3,
      bucket: config.S3_BUCKET,
      log: console.log,
    });
    console.log(
      `Seed listo: ${summary.applications} candidaturas y ${summary.documents} documentos en ${db.databaseName} / ${config.S3_BUCKET}.`,
    );
  } finally {
    s3.destroy();
    await client.close();
  }
} catch (err) {
  console.error(
    `Seed fallido: ${err instanceof Error ? err.message : "error desconocido"}`,
  );
  process.exitCode = 1;
}
