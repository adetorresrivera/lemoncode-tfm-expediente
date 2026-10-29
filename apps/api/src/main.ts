import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig, type Config } from "./config.js";
import { connectMongo, pingMongo } from "./db/mongo.js";
import { createLlmClient } from "./llm/llm.client.js";
import { createS3Client, ensureBucket, pingS3 } from "./storage/s3.js";

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err instanceof Error ? err.message : "Invalid environment");
  process.exit(1);
}

const { client: mongoClient, db } = await connectMongo(config.MONGO_URL);
const s3 = createS3Client(config);
await ensureBucket(s3, config.S3_BUCKET);
const llm = createLlmClient(config);

const here = dirname(fileURLToPath(import.meta.url));
const webDistDir =
  config.WEB_DIST_DIR ??
  (config.NODE_ENV === "production" ? resolve(here, "../../web/dist") : undefined);

const app = createApp({
  pingMongo: () => pingMongo(db),
  pingS3: () => pingS3(s3, config.S3_BUCKET),
  pingLlm: () => llm.ping(),
  webDistDir,
});

const server = serve({ fetch: app.fetch, port: config.PORT });
console.log(`API listening on port ${config.PORT}`);

function shutdown(): void {
  server.close();
  void mongoClient.close().finally(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
