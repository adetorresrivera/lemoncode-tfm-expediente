// Loads the demo data (12 applications and 3 documents) into Mongo and Silo through the same
// services a user goes through. Idempotent: a normal run replaces only the records it created
// before; `--reset` wipes every application, document and bucket object first, after saying what
// it is about to delete (rehearsals start from the same list).
// Run with `npm run seed [-- --reset]` (needs `npm run build` first) or, in the image,
// `docker compose exec app npm run seed [-- --reset]`. Not part of `npm run test`.
import { loadConfig, type Config } from "../config.js";
import { connectMongo } from "../db/mongo.js";
import { createS3Client, ensureBucket } from "../storage/s3.js";
import { parseSeedArgs, runSeed, SeedUsageError } from "./seed/seed.run.js";

// Options are checked before anything connects: a typo never runs a seed nobody asked for.
let options: { reset: boolean };
try {
  options = parseSeedArgs(process.argv.slice(2));
} catch (err) {
  if (err instanceof SeedUsageError) {
    console.error(err.message);
    process.exit(2);
  }
  throw err;
}

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
      reset: options.reset,
      log: console.log,
    });
    console.log(
      `Seed listo: ${summary.applications} candidaturas y ${summary.documents} documentos en ${db.databaseName} / ${config.S3_BUCKET}.`,
    );
    console.log("Ofertas para pegar en la demo: docs/demo/ofertas/");
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
