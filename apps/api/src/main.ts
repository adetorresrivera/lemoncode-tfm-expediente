import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig, type Config } from "./config.js";
import { connectMongo, pingMongo } from "./db/mongo.js";
import { createLlmClient } from "./llm/llm.client.js";
import { retryStartup } from "./startup.js";
import {
  createDocumentStorage,
  createS3Client,
  ensureBucket,
  pingS3,
} from "./storage/s3.js";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : "Invalid environment");
  process.exit(1);
}

const s3 = createS3Client(config);
let connection: Awaited<ReturnType<typeof connectMongo>>;
try {
  // A cold machine starts Mongo and Silo after the API: retry instead of dying on the first error.
  connection = await retryStartup(
    async () => {
      const conn = await connectMongo(config.MONGO_URL);
      try {
        await ensureBucket(s3, config.S3_BUCKET);
        return conn;
      } catch (err) {
        await conn.client.close();
        throw err;
      }
    },
    { attempts: 10, delayMs: 2000, log: console.error },
  );
} catch {
  console.error("API startup failed after 10 attempts");
  process.exit(1);
}
const { client: mongoClient, db } = connection;
const llm = createLlmClient(config);

const here = dirname(fileURLToPath(import.meta.url));
const webDistDir =
  config.WEB_DIST_DIR ??
  (config.NODE_ENV === "production"
    ? resolve(here, "../../web/dist")
    : undefined);

// A production start without the built SPA would serve 404s for every page: fail loudly instead.
if (
  config.NODE_ENV === "production" &&
  webDistDir !== undefined &&
  !existsSync(join(webDistDir, "index.html"))
) {
  console.error("Web build not found: index.html missing");
  process.exit(1);
}

const app = createApp({
  pingMongo: () => pingMongo(db),
  pingS3: () => pingS3(s3, config.S3_BUCKET),
  pingLlm: () => llm.ping(),
  webDistDir,
  db,
  llm,
  storage: createDocumentStorage(s3, config.S3_BUCKET),
});

const server = serve({ fetch: app.fetch, port: config.PORT });
console.log(`API listening on port ${config.PORT}`);

function shutdown(): void {
  server.close();
  void mongoClient.close().finally(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
