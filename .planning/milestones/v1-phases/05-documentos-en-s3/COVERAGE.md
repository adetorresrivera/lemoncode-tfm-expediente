# API Coverage — S3 (Silo, `pgsty/minio`) through `@aws-sdk/client-s3` 3.1152.0

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

The detector fired on the phrase «the web pods … consume these endpoints», which refers to the project's own documents API. The external surface this phase actually integrates is the S3 API of Silo, through the SDK already installed in Phase 1. The matrix below covers that surface; the closing paragraph names where each `INTEGRATE` row is implemented.

| capability | decision | reason |
|---|---|---|
| PutObject | INTEGRATE | |
| GetObject (streamed body) | INTEGRATE | |
| DeleteObject | INTEGRATE | |
| HeadBucket | INTEGRATE | |
| CreateBucket | INTEGRATE | |
| HeadObject | OPT-OUT | not needed: size, type and name come from the Mongo record; a missing object is detected by GetObject's NoSuchKey (D-10) |
| ListObjectsV2 | OPT-OUT | not needed: the library is listed from Mongo; the test bucket cleanup deletes the keys it recorded |
| CopyObject | OPT-OUT | explicitly out of scope: documents are never renamed or replaced (UI-SPEC out of scope) |
| DeleteObjects (batch) | OPT-OUT | not needed: one document is deleted at a time (D-11) |
| Multipart upload (Create, UploadPart, Complete, Abort) | OPT-OUT | not needed: files are at most 5 MB and fit one PutObject (RESEARCH, alternatives considered) |
| Presigned URLs (GetObject, PutObject) | OPT-OUT | explicitly out of scope: downloads stream through the API (D-10) and uploads must pass the API's signature check (D-02) |
| Bucket versioning and object versions | OPT-OUT | explicitly out of scope: library versions are LIB-01 (v2); a document's version is a metadata field |
| Object tagging and user metadata | OPT-OUT | not needed: every attribute lives in the Mongo record |
| Bucket policy, ACLs and CORS | OPT-OUT | not needed: single-user local app; objects are only reached through the API |
| Lifecycle rules | OPT-OUT | not needed: documents are deleted explicitly by the user |
| Server-side encryption | OPT-OUT | not needed yet: local Silo in the devcontainer and in compose; revisit for any hosted deployment |
| DeleteBucket | OPT-OUT | not needed: the bucket is created once by `s3-init` and `ensureBucket`; tests use their own `tfm-assets-test` bucket and only delete objects |

Implemented in: PutObject, GetObject and DeleteObject in `apps/api/src/storage/s3.ts` `createDocumentStorage` (05-01, contract test in 05-02); HeadBucket and CreateBucket already in `ensureBucket` and `pingS3` (Phase 1), reused by the test bucket helper (05-01).
