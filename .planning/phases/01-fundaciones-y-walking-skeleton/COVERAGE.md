# API Coverage — Phase 1 external services (MongoDB, Silo S3, Ollama, OpenAI-compatible)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Detector result at plan time: `{"detected": false}` (no trigger term in the phase scope). The matrix is written anyway because the phase does call four external service surfaces; Phase 1 integrates only their connectivity and bootstrap capabilities, and every business capability is owned by a later phase of the ROADMAP.

## MongoDB (official driver `mongodb` 7.7.0) — plan 01-01

| capability | decision | reason |
|---|---|---|
| mongo:connect | INTEGRATE | |
| mongo:ping command | INTEGRATE | |
| mongo:createIndexes on applications | INTEGRATE | |
| mongo:applications CRUD (find, insertOne, replaceOne, updateOne, deleteOne) | OPT-OUT | not needed yet — Phase 2 (APP-01 to APP-13) |
| mongo:aggregate tags with counts | OPT-OUT | not needed yet — Phase 2 (APP-14) |
| mongo:documents collection CRUD | OPT-OUT | not needed yet — Phase 5 (DOC-01 to DOC-06) |
| mongo:transactions, change streams, GridFS | OPT-OUT | explicitly out of scope — single-user app with two collections (docs/ARCHITECTURE.md) |

## S3 on Silo (`@aws-sdk/client-s3` 3.1152.0) — plan 01-01

| capability | decision | reason |
|---|---|---|
| s3:HeadBucket | INTEGRATE | |
| s3:CreateBucket | INTEGRATE | |
| s3:PutObject | OPT-OUT | not needed yet — Phase 5 (DOC-01) |
| s3:GetObject | OPT-OUT | not needed yet — Phase 5 (DOC-04) |
| s3:DeleteObject | OPT-OUT | not needed yet — Phase 5 (document lifecycle, DOC-05) |
| s3:ListObjectsV2, multipart upload, presigned URLs | OPT-OUT | explicitly out of scope — files of at most 5 MB stream through the API (docs/ARCHITECTURE.md) |
| s3:bucket policies, versioning, lifecycle, ACLs | OPT-OUT | explicitly out of scope — local single-user deliverable |

## Ollama HTTP API (`ollama/ollama:0.40.3`) — plans 01-01 and 01-06

| capability | decision | reason |
|---|---|---|
| ollama:GET /api/version | INTEGRATE | |
| ollama:pull model (gemma4:e2b) | INTEGRATE | |
| ollama:POST /api/chat with format JSON Schema | OPT-OUT | not needed yet — Phase 3 (AI-01, AI-02, AI-03) |
| ollama:GET /api/tags, /api/ps, /api/show | OPT-OUT | not needed — health only needs reachability; the model pull is verified by ollama-init |
| ollama:/api/generate, /api/embed, model create/copy/delete/push | OPT-OUT | explicitly out of scope — the product only uses chat extraction (docs/AI-EXTRACTION.md) |

## OpenAI-compatible API (provider `openai`) — plan 01-03

| capability | decision | reason |
|---|---|---|
| openai:GET /models | INTEGRATE | |
| openai:POST /chat/completions with response_format json_schema | OPT-OUT | not needed yet — Phase 3 (AI-02) |
| openai:embeddings, images, audio, files, assistants, responses | OPT-OUT | explicitly out of scope — not used by the product (docs/AI-EXTRACTION.md) |
