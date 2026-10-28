# Walking Skeleton — Expediente

**Phase:** 1
**Generated:** 2026-10-28

## Capability Proven End-to-End

`docker compose up --build` serves, from one `app` container on `http://localhost:8080`, the Expediente shell landing on `/applications` (DS tokens and fonts, responsive navigation, persistent theme switch) and a `GET /api/health` that reports live MongoDB, Silo (S3) and LLM connectivity.

Tracer: plan 01-01 Task 1 (compose → app → real health → built web index). Expansions: 01-01 Task 2 (error contract, env), 01-02 (quality gate), 01-03 (all contracts, LLM providers), 01-04 (routing, DS, http-client, formatters), 01-05 (shell, theme), 01-06 (README, phase gate).

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repository layout | npm workspaces: `apps/web` (@tfm/web), `apps/api` (@tfm/api), `packages/contracts` (@tfm/contracts) (D-01) | Shared Zod contracts without duplicated models; one lockfile |
| Toolchain | Node 22 (>=22.22.2), npm 10 with root `.npmrc` `legacy-peer-deps=true`, TypeScript 6.0.3 strict (not 7.x), exact pins at or before 2026-10-14 | npm 10.9 crashes on vitest 5 peers; typescript-eslint supports TS < 6.1 |
| Contracts resolution | Custom export condition `@tfm/source` for tsc/tsx/Vite/Vitest; compiled `dist` for production; ordered build contracts → api → web (D-02) | Typecheck, tests and dev need no prior build; production Node reads dist |
| API models | Zod 4 schemas + `z.infer` types only in `packages/contracts`; refine last on object schemas | Single source of truth (CLAUDE.md); Zod 4 derivation rules |
| API framework | Hono 4 + `@hono/node-server` 2; `createApp(deps)` factory; one `onError`, one top-level `notFound` (also the SPA fallback); `secureHeaders` without HSTS; no CORS | Testable with `app.request()` and fake deps; same-origin deployment |
| Error contract | `{ error: { code, message, details? } }`, codes from `errorCodeSchema` (D-10) | Uniform client handling through `errorResponseSchema` |
| Config | `envSchema` + `loadConfig` fail-fast; empty strings treated as absent; messages name variables, never values (D-07) | Compose passes `${VAR:-}`; no secret leakage |
| Data layer | Official `mongodb` 7 driver, no ODM; database `tfm` from `MONGO_URL`; named indexes created idempotently at boot; text index with `default_language: "none"` (D-08) | Two collections do not justify an ODM; index options cannot change silently later |
| Object storage | `@aws-sdk/client-s3` against Silo (`pgsty/minio`), `forcePathStyle`, bucket `tfm-assets` ensured at boot and by `s3-init` | S3-compatible local storage, same code path as real S3 |
| LLM | `LlmClient` (`extractStructured`, `ping`) + factory on `LLM_PROVIDER` = ollama \| openai \| mock; `ping()` feeds health; mock works offline (D-09) | Provider swap by env only; mock is the demo plan B |
| Health | `GET /api/health` → `{ status: "ok", mongo, s3, llm }`, probes in parallel capped at 2.5 s, always HTTP 200 (D-12) | Never hangs; each field reflects real connectivity |
| Auth | None: single-user local app; `ownerId` reserved and always `null` | Product decision (PRODUCT.md, out of scope list) |
| Web stack | React 19 + Vite 8 + TanStack Router file routes (`routeTree.gen.ts` committed) (D-13) | Typed routes; fresh clones typecheck without Vite |
| Web architecture | `core/` (router, http, theme), `common/` (ui primitives, lib), `layouts/`, `scenes/`, `pods/`; routes → scenes → pods; a pod's `index.ts` exports only its container; no pod imports another (D-14) | Course architecture (CLAUDE.md) |
| Styling | Tailwind v4; `apps/web/src/styles.css` is a byte copy of `docs/design/expediente.css`; DS tokens only; shadcn new-york primitives generated without `shadcn init` (D-15) | Tokens never regenerated; no hex or palette classes |
| Theme | `dark` class on `<html>`; preference `system` \| `light` \| `dark` in `localStorage["expediente-theme"]` with try/catch; pre-hydration script (D-16) | System default, persistence, no flash |
| Data fetching | Own hooks with `fetch` + `AbortController` over `core/http/http-client.ts` (`request`, `HttpError`) | Course style; no React Query in the MVP |
| Deployment target | Multi-stage Dockerfile (`node:22.23.2-slim`, user `node`, HEALTHCHECK) → image `tfm-app:0.1.0`; `compose.yml` with `mongo:8.0.32`, `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`, `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`, `ollama/ollama:0.40.3`; ports `127.0.0.1:8080` and `127.0.0.1:9001` only; app never waits for the model pull (D-20, D-21) | Pinned, reproducible local deliverable; no `latest` |
| Quality gate | ESLint 10 flat + Prettier 3 + Husky 9 / lint-staged 17 (pre-commit lint + format, pre-push typecheck); Vitest 5 + Testing Library + jsdom (D-04) | Bad code rejected before it lands |
| Verification | `scripts/compose-smoke.sh` (`--down`, `--with-model`) via `docker compose exec` (no curl in the runtime image) (D-23) | Works from the devcontainer (Docker-outside-of-Docker) |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — plans 01-01, 01-02
- [x] Routing — `/` redirects to `/applications` (real route, scene and pod) — plan 01-04
- [ ] Database — at least one real read AND one real write of application data — deferred to Phase 2 (APP-01, APP-04): CONTEXT.md excludes business functionality from Phase 1. Phase 1 does write to MongoDB (idempotent `createIndexes` on `applications` at boot) and reads it on every health call (`ping`), and writes to Silo (`CreateBucket`) and reads it (`HeadBucket`).
- [x] UI — interactive elements: theme switch (persisted) and the navigation Sheet — plan 01-05. The typed `http-client` that speaks the API contracts is built and tested (plan 01-04); the first screen that renders API data is Phase 2's list.
- [x] Deployment — documented local full-stack run: `docker compose up --build` + `bash scripts/compose-smoke.sh` — plans 01-01, 01-06

## Out of Scope (Deferred to Later Slices)

- Applications CRUD, list filters in the URL, detail, status history rules, `GET /api/tags` (Phase 2)
- `@tanstack/react-form` and the application form (Phase 2)
- `validateSearch` on `/applications`, «Añadir candidatura» button and counter (Phase 2)
- `common/components/{request-status,status-badge,tag-chip,ai-mark}.tsx` (Phases 2-3)
- Offer extraction: `POST /api/offers/extract`, prompt, normalisation, Ollama `/api/chat` and OpenAI `chat/completions` calls (Phase 3)
- Interview rounds (Phase 4)
- Document upload/download/delete and S3 `PutObject`/`GetObject`/`DeleteObject` (Phase 5)
- Seed data, complete README, responsive/a11y audit (Phase 6)
- Defense material and ADRs in `docs/decisiones.md` (Phase 7)
- Aligning `.devcontainer/docker-compose.yml` image tags with the compose pins (follow-up, user decision)
- Login, multi-user, cloud deployment (out of scope for the product)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Candidaturas — create, list with URL filters, detail, status changes with history (first real reads/writes of `applications`)
- Phase 3: Autocompletado con IA — paste an offer, reviewable draft through `LlmClient.extractStructured`
- Phase 4: Rondas de entrevista — interview rounds with the automatic move to `en_entrevistas`
- Phase 5: Documentos en S3 — upload, link and download CV and cover letters
- Phase 6: Pulido de demo — seed, README, responsive and accessibility pass, pending tests
- Phase 7: Documentación y defensa — deck, demo script, AI-usage doc, ADRs
