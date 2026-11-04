import type { S3Client } from "@aws-sdk/client-s3";
import type { DocumentStorage } from "../storage/s3.js";
import {
  createDocumentStorage,
  createS3Client,
  ensureBucket,
} from "../storage/s3.js";

// Dedicated bucket, like tfm_test for Mongo: tests never touch the development bucket tfm-assets.
export const TEST_BUCKET = "tfm-assets-test";

export interface FakeObject {
  body: Uint8Array;
  contentType: string;
}

// In-memory storage for every test that does not need the real Silo. With failDelete the delete
// rejects (the message carries no key), to prove the callers never depend on it succeeding.
export function fakeStorage(options: { failDelete?: boolean } = {}): {
  storage: DocumentStorage;
  objects: Map<string, FakeObject>;
} {
  const objects = new Map<string, FakeObject>();
  const storage: DocumentStorage = {
    async put(key, body, contentType) {
      objects.set(key, { body, contentType });
    },
    async get(key) {
      const object = objects.get(key);
      return object ? { stream: new Blob([object.body]).stream() } : null;
    },
    async delete(key) {
      if (options.failDelete) throw new Error("storage unavailable");
      objects.delete(key);
    },
  };
  return { storage, objects };
}

export interface TestStorage {
  storage: DocumentStorage;
  /** Every key written through `storage`, so cleanup can remove exactly those objects. */
  keys: string[];
  cleanup(): Promise<void>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required for API integration tests that use Silo (devcontainer)`,
    );
  }
  return value;
}

// The real adapter against the real Silo, in the dedicated test bucket.
export async function useTestStorage(): Promise<TestStorage> {
  const s3: S3Client = createS3Client({
    S3_ENDPOINT: requireEnv("S3_ENDPOINT"),
    S3_REGION: process.env["S3_REGION"] ?? "us-east-1",
    S3_FORCE_PATH_STYLE: process.env["S3_FORCE_PATH_STYLE"] !== "false",
    S3_ACCESS_KEY: requireEnv("S3_ACCESS_KEY"),
    S3_SECRET_KEY: requireEnv("S3_SECRET_KEY"),
  });
  await ensureBucket(s3, TEST_BUCKET);

  const real = createDocumentStorage(s3, TEST_BUCKET);
  const keys: string[] = [];
  const storage: DocumentStorage = {
    async put(key, body, contentType) {
      keys.push(key);
      await real.put(key, body, contentType);
    },
    get: (key) => real.get(key),
    delete: (key) => real.delete(key),
  };

  return {
    storage,
    keys,
    cleanup: async () => {
      await Promise.all(keys.map((key) => real.delete(key)));
      s3.destroy();
    },
  };
}

// "%PDF-1.4\n" + filler + "\n%%EOF", exactly `size` bytes (minimum: header and trailer).
export function pdfBytes(size = 64): Uint8Array {
  const header = "%PDF-1.4\n";
  const trailer = "\n%%EOF";
  const total = Math.max(size, header.length + trailer.length);
  const out = new Uint8Array(total);
  out.fill(0x20);
  out.set(Buffer.from(header, "latin1"), 0);
  out.set(Buffer.from(trailer, "latin1"), total - trailer.length);
  return out;
}

export interface ZipOptions {
  /** Data-descriptor flag: the local header carries no sizes (what streaming writers produce). */
  streamed?: boolean;
  comment?: string;
  contents?: Readonly<Record<string, string>>;
}

// Stored (method 0) entries. The CRC is 0 on purpose: the detector reads names from the central
// directory and never inflates or checks content, so a real checksum would test nothing.
export function zipBytes(
  entries: readonly string[],
  options: ZipOptions = {},
): Uint8Array {
  const { streamed = false, comment = "", contents = {} } = options;
  const flags = streamed ? 0x0008 : 0;
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const name of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const content = Buffer.from(contents[name] ?? "x", "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt32LE(0, 14); // crc
    local.writeUInt32LE(streamed ? 0 : content.length, 18);
    local.writeUInt32LE(streamed ? 0 : content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const chunk = [local, nameBytes, content];
    if (streamed) {
      const descriptor = Buffer.alloc(16);
      descriptor.writeUInt32LE(0x08074b50, 0);
      descriptor.writeUInt32LE(0, 4);
      descriptor.writeUInt32LE(content.length, 8);
      descriptor.writeUInt32LE(content.length, 12);
      chunk.push(descriptor);
    }

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(flags, 8);
    entry.writeUInt32LE(content.length, 20);
    entry.writeUInt32LE(content.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);

    const written = Buffer.concat(chunk);
    parts.push(written);
    offset += written.length;
  }

  const directory = Buffer.concat(central);
  const commentBytes = Buffer.from(comment, "utf8");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(commentBytes.length, 20);

  return new Uint8Array(
    Buffer.concat([...parts, directory, end, commentBytes]),
  );
}

export function docxBytes(options: { streamed?: boolean } = {}): Uint8Array {
  return zipBytes(["[Content_Types].xml", "word/document.xml"], options);
}

export function uploadForm(
  fields: { type?: string; name?: string; version?: string },
  file?: { bytes: Uint8Array; name: string; type?: string },
): FormData {
  const form = new FormData();
  for (const key of ["type", "name", "version"] as const) {
    const value = fields[key];
    if (value !== undefined) form.append(key, value);
  }
  if (file) {
    form.append(
      "file",
      new File([file.bytes], file.name, { type: file.type ?? "" }),
    );
  }
  return form;
}

export async function readStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
