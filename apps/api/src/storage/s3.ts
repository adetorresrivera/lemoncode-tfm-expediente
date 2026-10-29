import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import type { Config } from "../config.js";

type S3Config = Pick<
  Config,
  "S3_ENDPOINT" | "S3_REGION" | "S3_FORCE_PATH_STYLE" | "S3_ACCESS_KEY" | "S3_SECRET_KEY"
>;

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    maxAttempts: 1,
  });
}

export async function ensureBucket(s3: S3Client, bucket: string): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    if (!(err instanceof S3ServiceException) || err.$metadata.httpStatusCode !== 404) throw err;
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (createErr) {
      // Raced with the s3-init container: the bucket already exists.
      const tolerated = ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"];
      if (!(createErr instanceof S3ServiceException) || !tolerated.includes(createErr.name)) {
        throw createErr;
      }
    }
  }
}

export async function pingS3(s3: S3Client, bucket: string): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    return false;
  }
}
