# API Coverage — Phase 2 external services (MongoDB)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Detector result at plan time: `{"detected": true}`, triggered by the phrase "API integration tests" (tests of the project's own Hono API). The only external service this phase calls is MongoDB through the official `mongodb` driver 7.7.0; Silo (S3) and Ollama/OpenAI are not touched (Phase 1 connectivity only; Phases 3 and 5 own their business capabilities). The project's own HTTP API is internal and covered by the plans, not by this matrix.

## MongoDB (official driver `mongodb` 7.7.0) — plans 02-01 to 02-09

| capability | decision | reason |
|---|---|---|
| mongo:createIndexes via ensureIndexes (incl. tags.key_1) | INTEGRATE | |
| mongo:insertOne applications (POST) | INTEGRATE | |
| mongo:find with filter and sort (GET list, null-last sort) | INTEGRATE | |
| mongo:findOne by _id (GET item, no-op status check) | INTEGRATE | |
| mongo:findOneAndUpdate pipeline update (PATCH status) | INTEGRATE | |
| mongo:findOneAndUpdate with $set whitelist (PUT) | INTEGRATE | |
| mongo:deleteOne applications (DELETE) | INTEGRATE | |
| mongo:aggregate tags with counts ($unwind/$group, GET /api/tags) | INTEGRATE | |
| mongo:deleteMany on the tfm_test database (test reset only) | INTEGRATE | |
| mongo:pagination (skip/limit, cursors) | OPT-OUT | explicitly out of scope — D-10, single user with dozens of records |
| mongo:$text search on title_company_text | OPT-OUT | not needed — D-03 uses an escaped case-insensitive regex; the index stays unused |
| mongo:collation-based queries and collated indexes | OPT-OUT | not needed — tags compare through the stored normalized key (RESEARCH Q4a) |
| mongo:documents collection CRUD | OPT-OUT | not needed yet — Phase 5 (DOC-01 to DOC-06); Phase 2 only proves deletes never touch it |
| mongo:interviews subdocument updates | OPT-OUT | not needed yet — Phase 4 (INT-01 to INT-05) |
| mongo:transactions, change streams, GridFS, bulkWrite | OPT-OUT | explicitly out of scope — single-document atomic updates are enough (docs/ARCHITECTURE.md) |
