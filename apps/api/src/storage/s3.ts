import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import type { Config } from "../config.js";

type S3Config = Pick<
  Config,
  | "S3_ENDPOINT"
  | "S3_REGION"
  | "S3_FORCE_PATH_STYLE"
  | "S3_ACCESS_KEY"
  | "S3_SECRET_KEY"
>;

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    maxAttempts: 1,
  });
}

export async function ensureBucket(
  s3: S3Client,
  bucket: string,
  timeoutMs = 5000,
): Promise<void> {
  void timeoutMs; // RED stub: deadline not applied yet
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    if (
      !(err instanceof S3ServiceException) ||
      err.$metadata.httpStatusCode !== 404
    )
      throw err;
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (createErr) {
      // Raced with the s3-init container: the bucket already exists.
      const tolerated = ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"];
      if (
        !(createErr instanceof S3ServiceException) ||
        !tolerated.includes(createErr.name)
      ) {
        throw createErr;
      }
    }
  }
}

export async function pingS3(
  s3: S3Client,
  bucket: string,
  timeoutMs = 2000,
): Promise<boolean> {
  void timeoutMs; // RED stub: deadline not applied yet
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    return false;
  }
}

export interface StoredObject {
  stream: ReadableStream<Uint8Array>;
}

// Narrow adapter over the bucket: the documents module depends on this interface, tests inject a fake.
export interface DocumentStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** Null when the key does not exist. */
  get(key: string): Promise<StoredObject | null>;
  /** Idempotent: deleting a missing key does not fail. */
  delete(key: string): Promise<void>;
}

export function createDocumentStorage(
  s3: S3Client,
  bucket: string,
): DocumentStorage {
  return {
    async put(key, body, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const out = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (!out.Body) return null;
        return { stream: out.Body.transformToWebStream() };
      } catch (err) {
        if (err instanceof NoSuchKey) return null;
        throw err;
      }
    },
    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
