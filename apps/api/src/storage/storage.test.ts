import { createServer, type Server, type Socket } from "node:net";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createS3Client, ensureBucket, pingS3 } from "./s3.js";
import {
  pdfBytes,
  readStream,
  useTestStorage,
  type TestStorage,
} from "../test/documents.js";

// The real adapter against the real Silo, in the dedicated bucket tfm-assets-test only.
describe("DocumentStorage against Silo", () => {
  let testStorage: TestStorage;

  beforeAll(async () => {
    testStorage = await useTestStorage();
  });

  afterAll(async () => {
    await testStorage.cleanup();
  });

  it("streams back the stored bytes, then answers null once deleted", async () => {
    const key = `documents/storage-contract/${Date.now()}.pdf`;
    const bytes = pdfBytes(200);
    const { storage } = testStorage;

    await storage.put(key, bytes, "application/pdf");
    const stored = await storage.get(key);
    expect(stored).not.toBeNull();
    if (stored === null) return;
    expect(await readStream(stored.stream)).toEqual(bytes);

    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it("answers null for a key that was never written", async () => {
    expect(
      await testStorage.storage.get("documents/storage-contract/never-written"),
    ).toBeNull();
  });
});

// A server that accepts connections and never answers: the worst case for a health probe.
describe("S3 deadlines", () => {
  let server: Server;
  const sockets = new Set<Socket>();
  let silent: ReturnType<typeof createS3Client>;

  beforeAll(async () => {
    server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.on("error", () => undefined);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;
    silent = createS3Client({
      S3_ENDPOINT: `http://127.0.0.1:${port}`,
      S3_REGION: "us-east-1",
      S3_FORCE_PATH_STYLE: true,
      S3_ACCESS_KEY: "dummy",
      S3_SECRET_KEY: "dummy",
    });
  });

  afterAll(async () => {
    silent.destroy();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("pingS3 resolves false within the deadline against a server that never answers", async () => {
    const started = Date.now();
    expect(await pingS3(silent, "b", 300)).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("ensureBucket rejects within the deadline against a server that never answers", async () => {
    const started = Date.now();
    await expect(ensureBucket(silent, "b", 300)).rejects.toBeDefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
