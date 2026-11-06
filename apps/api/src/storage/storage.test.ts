import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  pdfBytes,
  readStream,
  useTestStorage,
  type TestStorage,
} from "../test/documents.js";

let testStorage: TestStorage;

beforeAll(async () => {
  testStorage = await useTestStorage();
});

afterAll(async () => {
  await testStorage.cleanup();
});

// The real adapter against the real Silo, in the dedicated bucket tfm-assets-test only.
describe("DocumentStorage against Silo", () => {
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
