# Phase 1: Fundaciones y walking skeleton - Research

**Researched:** 2026-10-28
**Domain:** npm-workspaces monorepo (TS 6 / Zod 4 contracts), Hono API with real Mongo/S3/LLM health, Vite + React 19 + TanStack Router + Tailwind v4 + shadcn shell, multi-stage Docker + compose
**Confidence:** HIGH (almost every claim below was exercised in a throwaway prototype built in this session with the exact pinned versions, including a real `docker build` + `docker compose up` run against the pinned images)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Monorepo y tooling**
- **D-01:** npm workspaces: `apps/web` (`@tfm/web`), `apps/api` (`@tfm/api`), `packages/contracts` (`@tfm/contracts`).
- **D-02:** TypeScript strict con `tsconfig.base.json` en la raíz; project references o build en orden contracts → api → web.
- **D-03:** Scripts raíz: `dev` (concurrently), `build`, `test`, `lint`, `typecheck`, `format`, `seed` (stub en esta fase).
- **D-04:** ESLint flat config + Prettier + Husky + lint-staged (lint + prettier en staged; `typecheck` en pre-push).
- **D-05:** `.env.example` con todas las variables de `docs/ARCHITECTURE.md`; `.gitignore` con `.env`, `dist`, `node_modules`.

**contracts**
- **D-06:** Todas las enumeraciones de `docs/DOMAIN.md` y los esquemas Zod de `docs/ARCHITECTURE.md` desde ya: application, interview, tag, document, offer-extraction, error, query. Con tests de esquemas.

**api**
- **D-07:** Hono con `@hono/node-server`. `config.ts` valida el entorno con Zod y falla al arrancar si falta algo.
- **D-08:** Conexión Mongo con creación de índices; `storage/s3.ts` con `ensureBucket` al arrancar.
- **D-09:** `LlmClient` con los tres providers: `mock` completo; `ollama` y `openai` pueden ser stubs con `ping`.
- **D-10:** Middleware de errores que produce `{ error: { code, message } }` (`details?` opcional según CLAUDE.md).
- **D-11:** En producción sirve `apps/web/dist` con fallback a `index.html` para rutas que no sean `/api`.
- **D-12:** `GET /api/health` → `{ status, mongo, s3, llm }`, cada uno `"ok" | "error"`; responde 200 aunque `llm` falle.

**web**
- **D-13:** Vite + React 19 + TanStack Router con plugin de generación de rutas.
- **D-14:** Estructura completa de carpetas de `docs/ARCHITECTURE.md` (pods vacíos con `index.ts` donde toque).
- **D-15:** Tailwind v4 + shadcn (base neutral); copiar `docs/design/expediente.css` a `src/styles.css`; fuentes con `@fontsource-variable` (eb-garamond, source-sans-3, jetbrains-mono).
- **D-16:** `core/http/http-client.ts` tipado; `core/theme` con sistema/claro/oscuro en `localStorage` con try/catch.
- **D-17:** `layouts/app-layout.tsx`: sidebar de escritorio (≥1024 px) + Sheet en móvil + toggle de tema, según `docs/DESIGN.md`.
- **D-18:** Ruta `/` redirige a `/applications`; `/applications` muestra el estado vacío.
- **D-19:** `common/lib/format.ts` con `formatDate` («12 oct. 2026») y `formatMoney` («52.000 €») + tests.

**Docker**
- **D-20:** Dockerfile multi-stage (deps → build → runtime `node:22-slim`, usuario `node`, `HEALTHCHECK`).
- **D-21:** `compose.yml` en la raíz: `app`, `mongo:8`, `s3` (pgsty/minio, consola 9001), `s3-init` (pgsty/mc crea `tfm-assets`), `ollama` + `ollama-init` (pull de `LLM_MODEL`). Healthchecks y `depends_on` con `condition: service_healthy`. Versiones de imagen fijadas.
- **D-22:** README mínimo con cómo arrancar (se completa en la fase 6).

**Verificación de la fase**
- **D-23:** `npm run typecheck && npm run lint && npm run test && npm run build`, y `docker compose up --build` con `curl` a `/api/health`.

### Claude's Discretion
- Elección entre project references y build ordenado (D-02).
- Sonda de alcance del `llm` en `/api/health` en esta fase: mínima y consciente del provider; la fase 3 la sustituye por `LlmClient.ping()` (ver ROADMAP).
- Elección de versiones concretas de imágenes y dependencias (fijadas, ≥2 semanas de antigüedad); sin dependencias nuevas fuera del stack sin justificarlas en el SUMMARY del plan.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | `npm install`, `build`, `test`, `lint`, `typecheck` from the root of the workspaces monorepo | Root `.npmrc` (`legacy-peer-deps`) is REQUIRED for `npm install` to work (Pitfall 1); `@tfm/source` condition makes typecheck/test/lint independent of build order; ESLint must ignore `.claude/ .planning/ gsd/ docs/` (Pitfall 9) |
| FND-02 | Web and API import every API model from `@tfm/contracts` | Contracts package layout + consumer matrix (Pattern 1); Zod 4 refine-then-derive rule (Pitfall 8) |
| FND-03 | `GET /api/health` returns `{ status, mongo, s3, llm }` reflecting real connectivity | Verified probes + bounded timeouts (Pattern 3); stop/start test against real compose stack |
| FND-04 | API validates env with Zod at startup; every error is `{ error: { code, message, details? } }` | `config.ts` (empty-string cleaning, Pitfall 6), `onError`/`notFound` mapping (Pattern 4) |
| FND-05 | Lands on `/applications` inside shell with desktop sidebar + mobile sheet | TanStack Router file routes, `AppLayout`, shadcn Sheet (Pattern 6/7) |
| FND-06 | Theme Sistema/Claro/Oscuro persisted, default follows system | `core/theme` + pre-hydration inline script (Pattern 8) |
| FND-07 | Expediente design system (tokens, three font families) | Copy `docs/design/expediente.css` unchanged; fontsource imports already inside it; do NOT run `shadcn init` (Pitfall 4) |
| FND-08 | `docker compose up` → app at :8080, Mongo/Silo/Ollama healthy, multi-stage Dockerfile, pinned images | Verified Dockerfile + compose + pinned tags (Pattern 9) |
| FND-09 | Husky + lint-staged pre-commit (ESLint, Prettier, typecheck) | Verified hook rejection with `any` (Pattern 10) |
| FND-10 | `.env.example` lists every variable the system reads | `.env.example` skeleton + a unit test that diffs it against `envSchema.shape` (Validation Architecture) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted from `/workspaces/TFM/CLAUDE.md` and `/workspaces/TFM/.claude/CLAUDE.md`; treated as locked:

- Stack is CLOSED (no change without ADR in `docs/decisiones.md`): React 19 + TS strict + Vite, TanStack Router (file routes) / Form, Zod 4, Tailwind v4 + shadcn/ui, lucide-react; Hono (Node adapter) + official `mongodb` driver + `@aws-sdk/client-s3` + Zod 4; Vitest + Testing Library; ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged. Node 22, npm 10 workspaces.
- Code, identifiers, commits, file names in **English**; UI text in **Spanish** (tuteo, short sentences, no exclamations, no emojis).
- `packages/contracts` is the single source of truth for API models; web/API import from `@tfm/contracts`, never redefine.
- Frontend architecture: `core/ common/ layouts/ scenes/ pods/`; pod = `api/api.ts`, `<pod>.vm.ts`, `.mapper.ts`, `.hooks.ts`, `.container.tsx`, `.component.tsx`, `components/`, `index.ts` (exports only the container). View model must NOT derive from API model (`extends`/`Omit` forbidden). A pod never imports another pod. Routes → scenes → pods.
- Tailwind classes live next to the JSX; only DS tokens (`bg-primary`, `text-status-offer`…), no hex colours, no `bg-blue-500`.
- API: validate all input with contracts schemas; errors `{ error: { code, message, details? } }`; expose `id` (string) never `_id`; dates ISO 8601 UTC.
- No `any`. No new dependencies without justification in the plan SUMMARY.
- Secrets only in `.env` (gitignored); `.env.example` always updated. Never log full offer text.
- Every GSD plan ends with `<verify>` running at least `npm run typecheck && npm run test` plus task-specific checks.
- Git: branch per phase `phase/NN-nombre`, atomic Conventional Commits, one PR per phase via `/gsd-ship`, never push to `main`.
- `LLM_PROVIDER=mock` in tests. Security: ASVS L1 enforced, block on `high` (`.planning/config.json`).
- GSD workflow enforcement: file edits happen through a GSD command.

## Summary

The phase is a pure scaffolding phase with ONE real vertical slice: `docker compose up` → `GET /api/health` (real Mongo ping, real S3 head/ensure-bucket, provider-aware LLM probe) → themed web shell on `/applications`. I built that entire slice as a throwaway prototype (outside the repo) with the pinned versions below and ran it end to end: workspaces install, contracts build, API + web typecheck/lint/test/build, `docker build`, `docker compose up --wait`, and stop/start of Mongo, Silo and Ollama against the live `/api/health`. Everything in the "Code Examples" section is copied from that working prototype.

Today's registry is far from the training-data world, and four things will break a naive plan: (1) **npm 10.9.9 crashes** (`Cannot read properties of null (reading 'edgesOut')`) installing `vitest >= 4.1` — fixed by a root `.npmrc` with `legacy-peer-deps=true` (must also be COPYed into the Docker `deps` stage); (2) **TypeScript 7.0.2 is `latest` but typescript-eslint (peer `typescript >=4.8.4 <6.1.0`) cannot run on it** — pin `typescript@6.0.3`; (3) **`Intl` on Node 22.23 / ICU 78 outputs «12 oct 2026» (no period) and «5200 €» (no grouping for 4 digits)**, so D-19's literal strings need explicit normalisation (`formatToParts` + `useGrouping: "always"`); (4) the **shadcn CLI 4.21.5 now emits `import { cn } from "cn"` and silently installs a brand-new `cn` npm package** (v0.5.0, published 2026-10-16, violates the ≥2-week rule and "no new deps") — rewrite the import to the local `utils.ts` and remove the dep.

For D-02 the recommendation is **ordered build scripts, NOT project references**, combined with a custom export condition `@tfm/source` on `@tfm/contracts` so that `tsc --noEmit`, `tsx`, Vite and Vitest read contracts straight from `src/` (no prior build needed), while Node in production resolves the same package to compiled `dist/`. `gemma4:e2b` is confirmed real (ollama.com library; 4.6 GB Q4_K_M; already pulled on the dev Ollama, `size: 4587156505`).

**Primary recommendation:** Lead with a tracer slice in this order of risk — (1) root scaffold + `.npmrc` + lockfile + contracts, (2) API `/api/health` with real services, (3) Dockerfile + compose smoke, (4) web shell — because 1–3 contain the traps that cost days and are all already de-risked in the snippets below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shared API models (enums, schemas, types) | Shared package (`packages/contracts`) | — | Single source of truth consumed at build/run time by both tiers |
| Env validation / fail-fast startup | API / Backend | — | `config.ts` runs before any I/O; web has no secrets |
| Health aggregation (mongo/s3/llm) | API / Backend | Database / Storage | API owns probes; deps only answer ping |
| Index creation, bucket creation | API / Backend (startup) | Database / Storage | Idempotent `createIndexes` / `ensureBucket` on boot; `s3-init` is a belt-and-braces duplicate |
| Error contract `{ error: { code, message, details? } }` | API / Backend | Browser (http-client parses it) | One `onError`; client maps to `HttpError` |
| Static SPA serving + index fallback (prod) | API / Backend (Hono `serveStatic`) | CDN / Static (n/a) | Single `app` container serves `apps/web/dist` on 8080 |
| Dev proxy `/api` → :3000 | Frontend dev server (Vite) | — | Dev-only; prod is same-origin so no CORS |
| Routing / redirect `/` → `/applications` | Browser / Client (TanStack Router) | — | Pure SPA routing |
| Theme preference + persistence | Browser / Client | — | `localStorage` + `matchMedia`; pre-hydration inline script avoids flash |
| Responsive shell (sidebar ≥1024 px / Sheet) | Browser / Client | — | CSS breakpoint `lg:` + shadcn Sheet |
| Locale formatting (dates, money) | Browser / Client | — | `Intl` es-ES with explicit normalisation |
| Orchestration, healthchecks, volumes, model pull | Docker / compose | — | Outside app code |

## Standard Stack

All versions below are the **highest published on or before 2026-10-14** (`npm view <pkg> time`), pinned **exactly** (no `^`), and were installed and exercised together in the prototype. Provenance tag for every row: `[VERIFIED: npm registry + prototype install/typecheck/test/build]`.

### Core
| Library | Version (published) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| typescript | **6.0.3** (2026-04-16) | Compiler | **NOT 7.0.2 (`latest`)**: typescript-eslint peer is `>=4.8.4 <6.1.0`; TS 7 has no programmatic API [VERIFIED: `npm view typescript-eslint@8.71.2 peerDependencies`; CITED: devblogs.microsoft.com TS 6.0 notes] |
| zod | 4.6.7 (2026-10-12) | Contracts, env, validation | Project stack; `z.int()`, `z.iso.datetime()`, `z.stringbool()`, `z.toJSONSchema()` all exercised |
| hono | 4.13.13 (2026-10-04) | API framework | Project stack |
| @hono/node-server | 2.1.5 (2026-10-13) | Node adapter + `serveStatic` | Project stack; v2 `serve({ fetch, port })` verified |
| mongodb | 7.7.0 (2026-09-28) | Official driver | Project stack; engines node >=20.19 |
| @aws-sdk/client-s3 | 3.1152.0 (2026-10-14) | S3 against Silo | Project stack |
| react / react-dom | 19.3.1 (2026-10-14) | UI | Project stack |
| vite | 8.3.4 (2026-10-08) | Bundler/dev server (Rolldown-based) | Project stack; engines `^20.19.0 \|\| >=22.12.0` |
| @vitejs/plugin-react | 6.1.2 (2026-10-05) | React transform | peer `vite ^8.0.0` |
| @tanstack/react-router | 1.170.44 (2026-10-12) | File-based routing | Project stack |
| @tanstack/router-plugin | 1.168.46 (2026-10-14) | `routeTree.gen.ts` generator | Must precede `react()` in Vite plugins [CITED: tanstack.com/router/latest/docs/framework/react/installation/with-vite] |
| tailwindcss + @tailwindcss/vite | 4.3.3 (2026-07-16) | Styling | Project stack; peer vite `^5.2 \|\| ^6 \|\| ^7 \|\| ^8` |
| tw-animate-css | 1.4.0 (2025-09-24) | Animations imported by `expediente.css` | The DS file does `@import "tw-animate-css"` so it is mandatory |
| lucide-react | 1.57.0 (2026-10-14) | Icons | Project stack; all DS icons (`Bookmark Send MessagesSquare BadgeCheck Trophy CircleX Ban Sparkles Check Menu FileText LayoutDashboard`) exist |
| radix-ui | 1.8.1 (2026-10-12) | Unified Radix package imported by shadcn components | shadcn "new-york" components do `import { Dialog } from "radix-ui"` |
| class-variance-authority / clsx / tailwind-merge | 0.7.1 / 2.1.1 / 3.7.0 | shadcn helpers (`cn`) | Needed by generated components + local `utils.ts` |
| @fontsource-variable/eb-garamond / source-sans-3 / jetbrains-mono | 5.3.0 / 5.3.1 / 5.3.0 | Fonts | Already imported by `expediente.css`; `font-family` names are `"EB Garamond Variable"`, `"Source Sans 3 Variable"`, `"JetBrains Mono Variable"` (match `@theme inline`) |

### Supporting (dev / tooling)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 5.0.4 (2026-10-12) | Test runner (all workspaces) | engines `^22.12 \|\| ^24 \|\| >=26` |
| jsdom | 30.1.2 (2026-10-04) | Web test env | engines `^22.22.2 \|\| ^24.15 \|\| >=26` (hence root `engines.node >=22.22.2`) |
| @testing-library/react / dom / jest-dom / user-event | 16.3.3 / 10.4.2 / 7.0.1 / 14.6.8 | Component tests | `@testing-library/dom` must be installed explicitly (peer of RTL) |
| eslint | 10.12.0 (2026-10-02) | Lint (flat config only) | engines `^22.13` ok |
| @eslint/js | 10.0.1 | Recommended rules | |
| typescript-eslint | 8.71.2 (2026-10-12) | TS rules | peer eslint `^10`, typescript `<6.1.0` |
| eslint-plugin-react-hooks | 7.1.1 | Hooks rules; use `reactHooks.configs.flat.recommended` | |
| eslint-plugin-react-refresh | 0.5.7 | `reactRefresh.configs.vite` | |
| globals | 17.13.0 | env globals | |
| prettier | 3.9.10 (2026-10-10) | Formatting | `eslint-config-prettier` NOT needed (no formatting rules in ESLint 10 / ts-eslint 8) |
| husky | 9.1.7 | Git hooks | `prepare: "husky"` |
| lint-staged | 17.6.0 (2026-09-26) | Staged-file runner | engines `>=22.22.1` |
| concurrently | 10.0.6 (2026-10-08) | Root `dev` | engines `>=22` |
| tsx | 4.23.15 (2026-09-20) | API dev runner (`tsx watch`) | |
| @types/node | **22.20.5** (2026-10-01) | Node types | Match runtime Node 22; `latest` is 26.x — do not use |
| @types/react / @types/react-dom | 19.3.0 | React types | |
| shadcn (CLI, via `npx -y shadcn@4.21.5`, NOT a dependency) | 4.21.5 (2026-10-14) | Generates `ui/*.tsx` | See Pitfall 4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tfm/source` export condition | TS project references (`tsc -b`) | References need `composite` + emitted `.d.ts` for contracts before api/web typecheck, conflict with web `noEmit`, and still leave Vite/Vitest/tsx unresolved. Condition approach: zero build needed for typecheck/test/dev [VERIFIED: prototype with `dist/` deleted] |
| `legacy-peer-deps=true` in `.npmrc` | Upgrade npm to 11 in devcontainer + Docker | npm 11.21.1 installs fine [VERIFIED] but CLAUDE.md fixes npm 10; `.npmrc` is a one-line, image-independent fix |
| Hand-rolled `parse(schema, data)` helper | `@hono/zod-validator` (0.9.1) | Extra dependency to justify; Phase 1 has no body routes. Add in Phase 2 only if wanted |
| `dotenv` | Node `--env-file-if-exists` / container env | Devcontainer and compose already inject env; no dep needed |

**Installation (root, after writing manifests with exact pins):**
```bash
printf 'legacy-peer-deps=true\n' > .npmrc   # MUST exist before first install
npm install                                  # then commit package-lock.json
# shadcn components (run from apps/web, see Pitfall 4 for the mandatory post-steps):
npx -y shadcn@4.21.5 add button sheet dropdown-menu separator toggle-group --yes
```

**Version verification:** every version above was resolved with `npm view <pkg> time --json` filtered to `<= 2026-10-14`; `latest` differs for react (same), vite (8.3.5), vitest (5.0.5), eslint (10.13.0), hono (4.13.14), typescript (7.0.2 — intentionally not used). Borderline (published on the cutoff day, 2026-10-14): react/react-dom 19.3.1, @aws-sdk/client-s3 3.1152.0, lucide-react 1.57.0, @tanstack/router-plugin 1.168.46, shadcn 4.21.5 — all passed the prototype.

### Container images (pinned, all manifests confirmed to exist)
| Image | Pin | Notes |
|-------|-----|-------|
| node | `node:22.23.2-slim` | Build + runtime. npm inside is 10.9.8 → same npm bug, `.npmrc` required [VERIFIED: docker build]. Tag last pushed 2026-09-19 |
| mongo | `mongo:8.0.32` | Tag last pushed 2026-10-02. **`mongo:8` currently resolves to 8.3.13** (rapid release) [VERIFIED: `mongod --version` in the dev container]; D-21 says "mongo:8" — pin the 8.0 line for stability |
| pgsty/minio | `pgsty/minio:RELEASE.2026-08-04T00-00-00Z` | Newest tag at research time (also `latest`). Has `curl` at `/usr/bin/curl` [VERIFIED] |
| pgsty/mc | `pgsty/mc:RELEASE.2026-09-16T00-00-00Z` | Newer tags (2026-10-18+) are < 2 weeks old. Entrypoint `/usr/bin/mc`; has `/bin/sh` [VERIFIED] |
| ollama/ollama | `ollama/ollama:0.40.3` | Tag pushed 2026-10-11, manifest exists [VERIFIED `docker manifest inspect`]. **Not pulled in the prototype** (test used the already-local 0.40.11 + a 45 MB model). Gemma 4 needs Ollama ≥0.22 per secondary sources [ASSUMED] so 0.40.3 should be fine; the dev Ollama (0.40.11) serves `gemma4:e2b` today |

## Package Legitimacy Audit

`gsd-tools query package-legitimacy check --ecosystem npm …` returned **no SLOP**. It returned `SUS too-new` for many packages because it keys on the age of the *latest release*, not of the package. I cross-checked package age, weekly downloads and source repo for every runtime/dev package (below); all are long-established, high-download, official-org packages. Pinning to ≥2-week-old versions is the mitigation for the release-recency signal.

| Package | Registry | Age (created) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|---------------|-----------|-------------|---------|-------------|
| zod, hono, @hono/node-server, mongodb, @aws-sdk/client-s3, react, vite, @vitejs/plugin-react, @tanstack/*, tailwindcss, @tailwindcss/vite, lucide-react, radix-ui, vitest, jsdom, @testing-library/*, eslint, typescript-eslint, eslint-plugin-react-*, globals, prettier, husky, lint-staged, concurrently, tsx, typescript | npm | 2011–2024 | 4.7M–371M/wk | official GitHub orgs | OK (tool: OK or SUS-too-new on latest release only) | Approved at pinned ≥2-week-old versions |
| class-variance-authority, clsx, tailwind-merge, tw-animate-css | npm | 2018–2025 | high | github (joe-bell, lukeed, dcastil, Wombosvideo) | OK | Approved |
| @fontsource-variable/{eb-garamond,source-sans-3,jetbrains-mono} | npm | 2023-05 | 0.4M–2.6M/wk | fontsource/font-files | OK (tool: `unknown-downloads` for jetbrains-mono; registry shows 2.55M/wk) | Approved |
| `cn` (0.5.0, auto-added by shadcn CLI) | npm | name from 2013, now maintained by `shadcn`; **0.5.0 published 2026-10-16** | n/a | github.com/shadcn-ui/cn | SUS too-new | **DO NOT INSTALL** — rewrite imports to local `utils.ts` (Pitfall 4) |

**Packages removed due to SLOP verdict:** none.
**Packages flagged SUS:** `cn` only (planner: no `checkpoint:human-verify` needed because the plan forbids installing it; add a verify step `! grep -rn 'from "cn"' apps/web/src && ! grep -n '"cn"' apps/web/package.json`).
All package names above come from official docs / the prior-stack list in CLAUDE.md and were re-confirmed on the registry; none are `[ASSUMED]` names.

## Architecture Patterns

### System Architecture Diagram

```
                         docker compose up --build  (host: 8080, 9001)
 ┌──────────┐   :8080   ┌───────────────────────────── app (node:22-slim, user node) ────────────────────────────┐
 │ Browser  │──────────►│ Hono                                                                                   │
 └──────────┘           │  /api/health ─► Promise.all( probe(mongo.ping) , probe(s3.HeadBucket) , probe(llm) )   │──► 200 {status,mongo,s3,llm}
      ▲                 │  /api/*      ─► (later phases) routes ─► ApiError/ZodError ─► app.onError ─► {error:…} │
      │ index.html,     │  other GET   ─► serveStatic(apps/web/dist) ─► (miss) notFound ─► index.html (SPA)      │
      │ assets          └───────┬──────────────────────┬──────────────────────┬──────────────────────────────────┘
      │                         │ mongodb://mongo:27017│ http://s3:9000       │ LLM_BASE_URL
      │                    ┌────▼────┐            ┌────▼─────┐          ┌─────▼──────┐
      │                    │ mongo   │            │ s3 (Silo)│◄─ s3-init│ ollama     │◄─ ollama-init (pull LLM_MODEL, async,
      │                    │ 8.0.32  │            │ minio    │  mc mb   │ 0.40.3     │   app does NOT wait for it)
      │                    └─────────┘            └──────────┘          └────────────┘
 DEV (devcontainer): Vite :5173 ──proxy /api──► tsx watch API :3000 ──► mongo/s3/ollama service names from devcontainer env
 BUILD ORDER: @tfm/contracts (tsc → dist) → @tfm/api (tsc → dist) → @tfm/web (vite build → dist)
 TYPECHECK/TEST/DEV: every consumer reads contracts/src through the "@tfm/source" export condition (no build needed)
```

### Recommended Project Structure
```
/
├─ .npmrc                         # legacy-peer-deps=true  (REQUIRED, see Pitfall 1)
├─ .gitignore  .gitattributes  .dockerignore  .env.example  .prettierrc.json  .prettierignore  .lintstagedrc.json
├─ .husky/{pre-commit,pre-push}
├─ eslint.config.js  tsconfig.base.json  package.json  package-lock.json
├─ Dockerfile  compose.yml  README.md
├─ packages/contracts/{package.json,tsconfig.json,tsconfig.build.json,src/*.schema.ts,src/*.test.ts}
├─ apps/api/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts,src/{main,app,config,errors}.ts,src/db/mongo.ts,src/storage/s3.ts,src/llm/*.ts}
└─ apps/web/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,components.json,index.html,src/…}   # structure per docs/ARCHITECTURE.md
```

### Pattern 1: Contracts resolution without a build (answers A, B, D-02)
**What:** `@tfm/contracts` exposes a custom condition `@tfm/source` → `src/index.ts`; `types`/`default` → compiled `dist`. Every dev-time consumer opts into the condition; production Node and the API build do not.
**Verified consumer matrix** (all with `packages/contracts/dist` deleted):

| Consumer | Opt-in |
|----------|--------|
| `tsc --noEmit` (contracts, api, web) | `"customConditions": ["@tfm/source"]` in each workspace `tsconfig.json` |
| `tsx watch` (API dev) | `tsx watch --conditions=@tfm/source src/main.ts` |
| Vite dev/build + Vitest (web) | `resolve.conditions: ["@tfm/source", "module", "browser", "development\|production"]` in `vite.config.ts` and `vitest.config.ts` |
| Vitest (api) | `ssr: { resolve: { conditions: ["@tfm/source"], externalConditions: ["@tfm/source"] } }` — `resolve.conditions` alone FAILS because the symlinked workspace package is externalised and resolved by Node. Verified fallback: `resolve.alias["@tfm/contracts"] = <abs path to src/index.ts>` |
| API prod build (`tsc -p tsconfig.build.json`) and `node apps/api/dist/main.js` | nothing (default → `dist`), so `build` MUST run contracts first |

`packages/contracts/package.json` (verified):
```json
{
  "name": "@tfm/contracts", "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": { "@tfm/source": "./src/index.ts", "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": { "build": "tsc -p tsconfig.build.json", "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "zod": "4.6.7" }
}
```
Contracts and API are emitted with `module/moduleResolution: NodeNext`, so **relative imports inside `src` need explicit `.js` extensions** (`export * from "./enums.js"`). Vite/Vitest/tsx map `.js`→`.ts` automatically. The web workspace overrides to `module: ESNext`, `moduleResolution: Bundler` (extensionless imports).

### Pattern 2: tsconfig set (TS 6.0.3 defaults changed)
TS 6 changed defaults: `strict` true, `module` esnext, `types: []`, `rootDir` = tsconfig dir, `noUncheckedSideEffectImports` true, `baseUrl` deprecated [CITED: devblogs.microsoft.com/typescript/announcing-typescript-6-0]. Consequences encoded below: always list `types`, never use `baseUrl` (use `paths` with `./` prefixes).
```jsonc
// tsconfig.base.json
{ "compilerOptions": { "target": "ES2023", "lib": ["ES2023"], "module": "NodeNext", "moduleResolution": "NodeNext",
  "strict": true, "noUncheckedIndexedAccess": true, "verbatimModuleSyntax": true, "isolatedModules": true,
  "skipLibCheck": true, "forceConsistentCasingInFileNames": true, "types": [] } }
// packages/contracts/tsconfig.json and apps/api/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "noEmit": true, "types": ["node"], "customConditions": ["@tfm/source"] }, "include": ["src"] }
// *.tsconfig.build.json (contracts, api): { "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"], "sourceMap": true /* contracts also "declaration": true */ }, "include": ["src"], "exclude": ["src/**/*.test.ts"] }
// apps/web/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "module": "ESNext", "moduleResolution": "Bundler", "lib": ["ES2023","DOM","DOM.Iterable"],
  "jsx": "react-jsx", "noEmit": true, "types": ["vite/client"], "customConditions": ["@tfm/source"], "paths": { "@/*": ["./src/*"] } },
  "include": ["src", "vite.config.ts", "vitest.config.ts"] }
```
Vite 8 option `resolve.tsconfigPaths: true` resolves the `@/*` alias for both Vite and Vitest [VERIFIED: `@/…` imports work in build and tests]; no `vite-tsconfig-paths` plugin.

### Pattern 3: API health with real, bounded probes
- Mongo: `new MongoClient(url, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 })`, `db.command({ ping: 1 })`; driver self-heals after Mongo restarts [VERIFIED].
- S3: `HeadBucketCommand` (cheap, one request). `forcePathStyle: true`, `maxAttempts: 1`. The SDK `requestTimeout` option only **warns** (`@smithy/node-http-handler … throwOnRequestTimeout`), so enforce the bound yourself.
- LLM: `ollama` → `GET {base}/api/version` (live: `{"version":"0.40.11"}`), `openai` → `GET {base}/models` + Bearer, `mock` → `true`; `AbortSignal.timeout(2000)`. Implement it as `LlmClient.ping()` on each provider now (D-09), so Phase 3 has nothing to swap. Note `/api/version` says nothing about the model being pulled — `llm: "ok"` while `ollama-init` is still pulling is acceptable (D-12).
- Every probe is wrapped in `probe(fn, 2500)` (Promise.race + timer) so `/api/health` can never hang. **Measured** against the real compose stack: all up 44–94 ms; Mongo stopped → `{"mongo":"error"}` in 2.55 s; Silo stopped → `{"s3":"error"}` 2.59 s; Ollama stopped → `{"llm":"error"}` 2.06 s; each recovered to `ok` after restart; status always 200. Docker `HEALTHCHECK --timeout=5s` leaves headroom.
- Indexes (`createIndexes` is idempotent when name+spec are unchanged; ran repeatedly on 8.0.32 and 8.3.13 without error). Quote of the source: `Índices: \`applications\`: \`{ status: 1 }\`, \`{ updatedAt: -1 }\`, \`{ "tags.label": 1 }\`, texto en \`{ title, company }\`.` [VERIFIED: docs/ARCHITECTURE.md:71]. Give every index an explicit `name`; changing a text-index option later (e.g. `default_language`) raises `IndexOptionsConflict`, so decide now (see Open Question 5).

### Pattern 4: Error contract & SPA fallback in Hono
- Use **one** `app.onError` + **one top-level** `app.notFound`. `notFound` registered on a sub-app is NOT used after `app.route("/api", api)` (verified: returned plain-text `404 Not Found`).
- Mapping order: `ApiError` → its code/status; `ZodError` → 400 `VALIDATION_ERROR` + `z.flattenError(err)` as `details`; **`SyntaxError`** → 400 `VALIDATION_ERROR` (Hono's `c.req.json()` throws a plain `SyntaxError` on a malformed body, not `HTTPException`); `HTTPException` 400/404 → mapped; everything else → 500 `INTERNAL_ERROR` with generic message (log `err.message` only; never the stack in the response, never request bodies).
- SPA: `app.use("*", serveStatic({ root: absoluteDist }))` falls through on a miss; the top-level `notFound` returns `index.html` for non-`/api` GETs and JSON 404 for `/api/*`. `root` is resolved against `process.cwd()` [CITED: hono.dev/docs/getting-started/nodejs], so pass an **absolute** path: `resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist")` from `apps/api/dist/main.js` (works from any cwd; verified running from `/tmp`). Allow `WEB_DIST_DIR` override.
- Add `secureHeaders({ strictTransportSecurity: false })` from `hono/secure-headers` (built in; verified default header set) — HSTS on plain-HTTP localhost is meaningless.

### Pattern 5: Testing the API without services
`createApp(deps)` takes `{ pingMongo, pingS3, pingLlm, webDistDir }` (functions). Tests call `app.request("/api/health")` with fakes — no Mongo/S3/LLM mocking libraries, no network [VERIFIED: 6 tests green]. `LLM_PROVIDER=mock` for any config-level test. Test `loadConfig(env)` by passing plain objects (pure function).

### Pattern 6: Web app skeleton (answers D)
- `vite.config.ts` plugin order **`tanstackRouter({ target: "react", autoCodeSplitting: true })` → `react()` → `tailwindcss()`**. Default `routesDirectory: ./src/routes`, `generatedRouteTree: ./src/routeTree.gen.ts`.
- **Commit `routeTree.gen.ts`** so that `tsc --noEmit`, ESLint and Vitest work on a fresh clone without running Vite first. It starts with `/* eslint-disable */` and `// @ts-nocheck`; additionally add it to `.prettierignore` and ESLint `globalIgnores` (TanStack docs recommend excluding it from linters/formatters [CITED: tanstack.com router with-vite]). Precondition for the file to be generated: `__root.tsx`, `index.tsx`, `applications/index.tsx` exist.
- `routes/index.tsx`: `beforeLoad: () => { throw redirect({ to: "/applications", replace: true }) }`. `routes/__root.tsx`: `createRootRoute({ component: AppLayout })` (the layout renders `<Outlet />`).
- Vite proxy (verified through `npm run dev`): `server: { port: 5173, proxy: { "/api": { target: "http://localhost:3000" } } }`.
- `routerTree` typing: `declare module "@tanstack/react-router" { interface Register { router: typeof router } }` in `core/router/router.ts`.

### Pattern 7: Tailwind v4 + shadcn + DS tokens
- Copy `docs/design/expediente.css` **byte-for-byte** to `apps/web/src/styles.css` (verified: builds with Tailwind 4.3.3/Vite 8 untouched). It already contains the `@import`s (tailwindcss, tw-animate-css, three fontsource packages), `@custom-variant dark (&:is(.dark *))`, the `:root`/`.dark` palettes, and `@theme inline` mapping every DS token to `--color-*`, so `bg-primary`, `bg-sidebar`, `text-status-offer`, `bg-ai-missing-bg`, `font-serif` etc. work with no hex in components. **Dark mode is toggled by the `dark` class on `<html>`** (`.dark { … }` selector) — not `data-theme`. [VERIFIED: docs/design/expediente.css:8,62]
- `components.json` (hand-written; **never run `shadcn init`** — it rewrites the CSS): `style: "new-york"`, `rsc: false`, `tsx: true`, `tailwind.css: "src/styles.css"`, `tailwind.config: ""`, `baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "lucide"`, aliases `components: "@/common/components"`, `ui: "@/common/components/ui"`, `utils: "@/common/lib/utils"`, `lib: "@/common/lib"`, `hooks: "@/common/hooks"`. Run `npx -y shadcn@4.21.5 add button sheet dropdown-menu separator toggle-group --yes` from `apps/web` (this generated `button sheet dropdown-menu separator toggle toggle-group`, all typecheck). Minimal set: **Button, Sheet, ToggleGroup (theme switch; `type="single"` renders `role="radio"`), Separator**; DropdownMenu is optional (generated anyway as part of the add list — drop it from the command if unused to keep the dep surface small).
- `apps/web/src/common/lib/utils.ts` must exist BEFORE running the CLI (`cn()` = `twMerge(clsx(inputs))`).
- Generated files contain `bg-black/50` (Sheet overlay) and un-Prettier'd style; run `prettier --write` on them and accept `bg-black/50` as a documented shadcn exception or change it to `bg-foreground/50`. ESLint override: `react-refresh/only-export-components: off` for `common/components/ui/**` (buttonVariants/toggleVariants exports trigger it).

### Pattern 8: Theme without flash
- `core/theme/theme.ts`: preference `"system" | "light" | "dark"` in `localStorage["expediente-theme"]` (both read and write in try/catch), `applyTheme` toggles `document.documentElement.classList` `dark` and sets `style.colorScheme`; `initTheme()` re-applies and subscribes to `matchMedia("(prefers-color-scheme: dark)")` `change` (only acts while preference is `system`); `useTheme()` via `useSyncExternalStore` (server snapshot `"system"`).
- Pre-hydration inline `<script>` in `index.html` `<head>` (same logic, try/catch) adds `dark` before first paint [VERIFIED code in prototype; flash-freeness itself is a manual browser check].
- `ThemeToggle` = shadcn `ToggleGroup type="single"` with items Sistema / Claro / Oscuro; guard `if (v)` in `onValueChange` (Radix emits `""` when the active item is clicked again).

### Pattern 9: Docker deliverable (verified end to end)
Dockerfile stages `deps` (manifests + `.npmrc` only, `npm ci --ignore-scripts`, BuildKit cache mount) → `build` (`npm run build`: contracts → api → web) → `prod-deps` (`npm ci --omit=dev --ignore-scripts --workspace=@tfm/api --include-workspace-root`) → `runtime` (`node:22.23.2-slim`, `NODE_ENV=production PORT=8080`, copies `node_modules`, root + workspace `package.json`, `packages/contracts/dist`, `apps/api/dist`, `apps/web/dist` with `--chown=node:node`, `USER node`, `HEALTHCHECK` via `node -e fetch(...)`). Result: image 376 MB, user uid 1000, `HEALTHCHECK` reported healthy, `/applications/1` served `index.html`. Runtime keeps the root `package.json` + `apps/api/package.json` so `docker compose exec app npm run seed` (Phase 6) can work.
compose behaviour verified: `up -d --build --wait --wait-timeout 240` returns 0 in ~36–46 s with images present; `app` becomes healthy as soon as mongo + s3 are healthy and `s3-init` exited 0, while `ollama-init` is still running (the model pull never blocks the app).

### Pattern 10: Hooks
`"prepare": "husky"`; `.husky/pre-commit` = `npx lint-staged`; `.husky/pre-push` = `npm run typecheck`. `.lintstagedrc.json`: `"*.{ts,tsx,js,mjs,cjs}": ["eslint --fix --max-warnings=0", "prettier --write"]`, `"*.{json,css,html,yml,yaml}": ["prettier --write"]`. Verified: committing `export const x: any = 1;` is rejected (`husky - pre-commit script failed (code 1)`, working tree restored, no commit created). `husky` without a `.git` directory prints `.git can't be found` and exits 0; `HUSKY=0` skips. Prettier runs with `--write` (auto-fix) rather than `--check`; a pure formatting problem is repaired instead of rejected — acceptable for FND-09, say so in the plan.

### Anti-Patterns to Avoid
- **Running `npx shadcn init`** (rewrites tokens/CSS; DESIGN.md forbids regenerating tokens).
- **`typescript@latest`** (7.x) or `@types/node@latest` (26.x).
- **`localhost`/`host.docker.internal` curl as the compose smoke test from inside the devcontainer** (see Pitfall 11).
- **Letting `app` `depends_on` `ollama-init`** (would block the demo on a 4.6 GB pull).
- **Sub-app `notFound`**, **extensionless relative imports in contracts/api**, **`baseUrl` in tsconfig**.
- **`RUN npm ci` with lifecycle scripts in Docker** (`husky` is absent under `--omit=dev`): use `--ignore-scripts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env parsing/coercion | manual `process.env` checks | Zod 4 `z.object` with `z.coerce.number()`, `z.stringbool()`, `z.url()` + one `superRefine` | Single error listing names (never values) |
| JSON-Schema for LLM `format` (Phase 3) | hand-written schema | `z.toJSONSchema(schema)` (returns draft 2020-12, `additionalProperties:false`) | Verified output |
| Zod error shape | custom walker | `z.flattenError(err)` → `{formErrors, fieldErrors}` | Stable `details` payload |
| Static SPA hosting | custom fs streaming | `serveStatic` + top-level `notFound` | Handles mime/caching/traversal (`%` paths blocked by default) |
| Workspace type sharing | path aliases to other packages | export condition `@tfm/source` | Works for tsc, tsx, Vite, Vitest |
| Dark-mode plumbing | own CSS var swapping | DS `.dark` palette + `@custom-variant dark` already shipped | Just toggle the class |
| Route tree | hand-written `createRoute` tree | TanStack plugin-generated `routeTree.gen.ts` | Typed links |
| Dialog/Sheet a11y (focus trap, Esc) | custom drawer | shadcn `Sheet` (Radix Dialog) | DESIGN.md requires focus trapping |
| Git hooks | custom `.git/hooks` scripts | Husky 9 + lint-staged | Verified |
| Container "wait for dep" | sleep loops in entrypoints | compose `healthcheck` + `depends_on: condition` | Verified |

**Key insight:** the only genuinely hand-written pieces are tiny (probe wrapper, `HttpError`, theme store, month-period normaliser); everything fragile is delegated to a tool already in the stack.

## Common Pitfalls

### Pitfall 1: `npm install` crashes under npm 10.9.x with Vitest ≥ 4.1
**What goes wrong:** `npm error Cannot read properties of null (reading 'edgesOut')` (arborist `#loadPeerSet`). Reproduced with only `vitest@5.0.4` (and 4.1.0…4.1.12, 5.0.0); `vitest@4.0.18` installs. Cause: vitest ≥4.1 adds a required peer `vite`. **Docker's `node:22` ships npm 10.9.8, so the image build fails too.**
**How to avoid:** root `.npmrc` containing `legacy-peer-deps=true` (verified: install OK, `npm ci` in Docker OK, `npm ls` clean) and COPY `.npmrc` in every Dockerfile stage that runs `npm ci`. Because peers are no longer auto-installed, **every peer must be a declared dependency** (already true in the stack tables: vite, @testing-library/dom, jsdom, @types/node, react, react-dom). npm 11 is the alternative [VERIFIED npm 11.21.1 installs], but contradicts CLAUDE.md.
**Warning signs:** ERESOLVE or the `edgesOut` TypeError at the very first `npm install`.

### Pitfall 2: TypeScript 7 breaks typescript-eslint
**What goes wrong:** `typescript@latest` is 7.0.2 (native); typescript-eslint 8.71.2 and 8.72.1 declare `typescript >=4.8.4 <6.1.0`; forcing it crashes ESLint. **Avoid:** pin `typescript@6.0.3` in the root `devDependencies` only. Revisit when typescript-eslint supports TS ≥7.1 [CITED: openreplay/dev.to TS7 migration articles via WebSearch, secondary].

### Pitfall 3: Contracts resolves to a missing `dist/`
**What goes wrong:** Vitest "Failed to resolve entry for package @tfm/contracts" (api) when only `resolve.conditions` is set. **Avoid:** use the matrix in Pattern 1; keep `build` order contracts → api → web; the Docker runtime copies `packages/contracts/dist`.

### Pitfall 4: shadcn CLI 4.x quirks
(a) `shadcn init` overwrites tokens → never run it. (b) Registry components import `cn` from a **new npm package `cn`**, which the CLI installs automatically (it also reorders/rewrites `package.json` and `package-lock.json`). **Mandatory post-steps:** `sed -i 's#from "cn"#from "@/common/lib/utils"#' apps/web/src/common/components/ui/*.tsx`; `git checkout`/edit `apps/web/package.json` + lockfile to drop `cn`; run `npm install` again; run Prettier on the generated files; verify no new deps beyond the pinned set (`git diff apps/web/package.json`). (c) Generated components rely on the single `radix-ui` package already pinned.

### Pitfall 5: Locale strings are not what D-19 literally says
Node 22.23.3 (ICU 78.3 / CLDR 48) [VERIFIED `process.versions`]: `Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short",year:"numeric"})` → `"12 oct 2026"` (no period) and `"5 sept 2026"`; `Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0})` → `"52.000 €"` for 52000 but **`"5200 €"` for 5200** (min grouping digits 2) and the separator before `€` is **U+00A0**. With `useGrouping: "always"` → `"5.200 €"`. Browsers' ICU differs from Node's, so rely on explicit normalisation, not on raw `Intl`. Use `formatToParts` and append `.` to the month part when missing (see Code Examples) and assert tests with ` `; pass a `timeZone` argument (tests use `"UTC"`) so tests don't depend on the machine TZ.

### Pitfall 6: Compose passes empty strings
`LLM_API_KEY: ${LLM_API_KEY:-}` yields `""` and a strict `z.string().min(1).optional()` rejects it — the app crash-looped in the prototype with `LLM_API_KEY: Too small…`. **Avoid:** `loadConfig` drops `undefined`/`""` entries before parsing. The failure message listed names only (no values) — keep that.

### Pitfall 7: Hono specifics
Sub-app `notFound` ignored (Pattern 4); malformed JSON is a `SyntaxError`; `serveStatic` root is cwd-relative; `HTTPException` carries its own status. Keep `onError` exhaustive and test each branch with `app.request()`.

### Pitfall 8: Zod 4.6 derivations
`.pick()/.omit()/.partial()` **throw at runtime** on object schemas that contain `.refine()` (`".pick() cannot be used on object schemas containing refinements"`); `.extend()` works. **Pattern:** define the plain field object first (`applicationFieldsSchema`), derive input/entity/partial variants from it, and apply `.refine(salaryMinLeMax)` last. `z.iso.datetime()` rejects offsets (`+02:00`) unless `{ offset: true }` — Mongo `toISOString()` output (`Z`) is fine. Multi-value query params need `z.preprocess` to wrap a single string into an array (Hono/URLSearchParams give a string for one value). Do not name the response type `ApiError` in contracts if the API also has an `ApiError` class: use `ErrorResponse`/`errorResponseSchema`.

### Pitfall 9: Linting/formatting the whole repo
There are **352** `.js/.cjs/.mjs/.ts` files under `.claude/`, `gsd/`, `.planning/`, `.devcontainer/` (GSD tooling). `eslint .` and `prettier --check .` must ignore `.claude .planning gsd .devcontainer docs` (and `**/dist`, `routeTree.gen.ts`, `package-lock.json`) or `npm run lint` fails on foreign code. lint-staged globs above exclude `*.md`.

### Pitfall 10: TS 6 `types: []`
Without `"types": ["node"]` (api/contracts) or `["vite/client"]` (web), `process`, `NodeJS.ProcessEnv`, `import.meta.env` and CSS side-effect imports fail. `noUncheckedSideEffectImports` is now true: `import "./styles.css"` is OK only because `vite/client` declares `*.css`. If `vite.config.ts` imports `node:*`, add `"node"` to web `types`.

### Pitfall 11: Smoke-testing compose from the devcontainer (Docker-outside-of-Docker)
The devcontainer drives the **host** Docker daemon, so published ports live on the host, not in the devcontainer. In this environment `curl http://localhost:8080` and `http://host.docker.internal:8080` both timed out while `host.docker.internal:9001` (Silo console) answered 200 [VERIFIED]. Hypothesis (unverified): `devcontainer.json` `forwardPorts` includes 8080 and VS Code's forward intercepts it [ASSUMED]. **Use instead:** `docker compose ps` (health column) and `docker compose exec -T app node -e "fetch('http://127.0.0.1:8080/api/health').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"` [VERIFIED]. D-23's "curl" step must be written this way (the runtime image has no curl/wget); optionally also document a host-side `curl`.

### Pitfall 12: Mongo/Ollama tag drift
`mongo:8` → 8.3.13 today (devcontainer uses it); pin `8.0.32` in `compose.yml`. `pgsty/mc` and `pgsty/minio` publish daily; `latest` is forbidden by ARCHITECTURE.md. The devcontainer compose still uses `:latest` for minio/mc/ollama — out of scope to edit but note the drift.

### Pitfall 13: jsdom gaps
`matchMedia` absent → stub in `test/setup.ts` (`vi.stubGlobal`, reset per test); `Window.scrollTo` "Not implemented" console noise from TanStack Router → `vi.stubGlobal("scrollTo", vi.fn())`. `localStorage` exists in jsdom and is cleared in `afterEach`. Router tests: render with `createMemoryHistory` + `createRootRoute({ component: AppLayout })` and `await screen.findBy…` (async).

### Pitfall 14: Line endings / Windows-WSL
Add `.gitattributes` (`* text=auto eol=lf`) and `.prettierrc.json` `"endOfLine": "lf"`; shell scripts and `.husky/*` must stay LF or the hooks fail with `\r` errors.

### Pitfall 15: Mongo `default_language` & text search
See Open Question 5.

## Code Examples

All blocks below were run in the prototype unless marked otherwise.

### Root `package.json` (scripts, engines, devDependencies exact pins)
```json
{
  "name": "expediente", "private": true, "type": "module",
  "engines": { "node": ">=22.22.2", "npm": ">=10" },
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "prepare": "husky",
    "dev": "concurrently -k -n api,web -c blue,green \"npm run dev -w @tfm/api\" \"npm run dev -w @tfm/web\"",
    "build": "npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run build -w @tfm/web",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint .",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "seed": "npm run seed -w @tfm/api --if-present"
  },
  "devDependencies": {
    "typescript": "6.0.3", "eslint": "10.12.0", "@eslint/js": "10.0.1", "typescript-eslint": "8.71.2",
    "eslint-plugin-react-hooks": "7.1.1", "eslint-plugin-react-refresh": "0.5.7", "globals": "17.13.0",
    "prettier": "3.9.10", "husky": "9.1.7", "lint-staged": "17.6.0", "concurrently": "10.0.6",
    "vitest": "5.0.4", "@types/node": "22.20.5"
  }
}
```
`apps/api` scripts: `"dev": "tsx watch --conditions=@tfm/source src/main.ts"`, `"build": "tsc -p tsconfig.build.json"`, `"start": "node dist/main.js"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, plus a stub `"seed": "node -e \"console.log('seed: pendiente (fase 6)')\""`. `apps/web` scripts: `dev: vite`, `build: vite build`, `typecheck: tsc --noEmit`, `test: vitest run`. (Per-workspace `vitest` runs resolve the root-installed binary.)

### ESLint flat config (root `eslint.config.js`) — passes clean, rejects `any`
```js
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/dist/**", "**/coverage/**", "**/node_modules/**", "apps/web/src/routeTree.gen.ts",
    ".claude/**", ".planning/**", "gsd/**", ".devcontainer/**", "docs/**"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-explicit-any": "error",
             "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }] } },
  { files: ["apps/web/**/*.{ts,tsx}"], languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite] },
  { files: ["apps/web/src/common/components/ui/**"], rules: { "react-refresh/only-export-components": "off" } },
  { files: ["apps/api/**/*.ts", "packages/**/*.ts", "*.config.{js,ts}", "apps/*/*.config.ts"],
    languageOptions: { globals: globals.node } },
]);
```
`.prettierignore`: `dist coverage node_modules package-lock.json apps/web/src/routeTree.gen.ts .planning .claude gsd docs *.md`. `.gitignore`: `node_modules dist coverage *.tsbuildinfo .env .env.*` and `!.env.example`.

### Contracts: quoted source values (do not paraphrase)
From `docs/DOMAIN.md:16-27`:
```ts
ApplicationStatus = "guardada" | "enviada" | "en_entrevistas" | "oferta_recibida"
                  | "aceptada" | "rechazada" | "descartada"
WorkMode          = "remoto" | "hibrido" | "presencial"
Seniority         = "junior" | "mid" | "senior" | "lead"
ContractType      = "indefinido" | "temporal" | "freelance" | "practicas" | "otro"
TagGroup          = "stack" | "nice_to_have" | "language"
InterviewType     = "rrhh" | "tecnica" | "prueba_tecnica" | "manager" | "cultural" | "otra"
InterviewMode     = "online" | "presencial" | "telefono"
InterviewOutcome  = "pendiente" | "superada" | "no_superada"
DocumentType      = "cv" | "carta"
```
From `docs/ARCHITECTURE.md:93`: `Códigos: 400 \`VALIDATION_ERROR\`, 404 \`NOT_FOUND\`, 409 \`DOCUMENT_IN_USE\`, 413 \`FILE_TOO_LARGE\`, 415 \`UNSUPPORTED_FILE_TYPE\`, 502 \`LLM_ERROR\`, 504 \`LLM_TIMEOUT\`, 500 \`INTERNAL_ERROR\`.` From `docs/ARCHITECTURE.md:76`: `| GET | \`/api/health\` | \`{ status: "ok", mongo, s3, llm }\` |`. Schema files per `docs/ARCHITECTURE.md:34-43`: `enums.ts tag.schema.ts interview.schema.ts application.schema.ts document.schema.ts offer-extraction.schema.ts error.schema.ts index.ts` (D-06 also asks for `query` → `applicationQuerySchema` lives in `application.schema.ts` per the same list). `offerExtractionSchema` is specified in `docs/AI-EXTRACTION.md:15-29`.

Verified idioms (excerpt of `application.schema.ts`):
```ts
export const applicationFieldsSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).nullable().default(null),
  workMode: workModeSchema.nullable().default(null),
  salaryMin: z.number().nonnegative().nullable().default(null),
  salaryMax: z.number().nonnegative().nullable().default(null),
  tags: z.array(tagSchema).max(20).default([]),
  sourceUrl: z.url().nullable().default(null),
  appliedAt: z.iso.datetime().nullable().default(null),
  /* …remaining fields from DOMAIN.md… */
});
const salaryOrder = (v: { salaryMin: number | null; salaryMax: number | null }) =>
  v.salaryMin === null || v.salaryMax === null || v.salaryMin <= v.salaryMax;
export const applicationInputSchema = applicationFieldsSchema
  .extend({ status: applicationStatusSchema.default("guardada") })
  .refine(salaryOrder, { path: ["salaryMax"], error: "salaryMax debe ser >= salaryMin" }); // refine LAST
export const statusChangeSchema = z.strictObject({ status: applicationStatusSchema });
const multi = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]), z.array(item).optional());
export const applicationQuerySchema = z.object({
  status: multi(applicationStatusSchema), tags: multi(z.string().min(1)),
  workMode: workModeSchema.optional(), seniority: senioritySchema.optional(),
  q: z.string().trim().min(1).optional(), sort: z.enum(["updatedAt", "appliedAt"]).default("updatedAt"),
});
// error.schema.ts
export const errorResponseSchema = z.object({ error: z.object({ code: errorCodeSchema, message: z.string(), details: z.unknown().optional() }) });
export const healthSchema = z.object({ status: z.literal("ok"), mongo: z.enum(["ok","error"]), s3: z.enum(["ok","error"]), llm: z.enum(["ok","error"]) });
```
Test pattern (Vitest, no setup): `safeParse` success/failure, `error.issues[0].path`, defaults applied, single and repeated query values, `details` optional.

### API `config.ts`
```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGO_URL: z.string().regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://"),
  S3_ENDPOINT: z.url(), S3_REGION: z.string().min(1).default("us-east-1"), S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY: z.string().min(1), S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(true),
  LLM_PROVIDER: z.enum(["ollama", "openai", "mock"]).default("ollama"),
  LLM_BASE_URL: z.url().optional(), LLM_MODEL: z.string().min(1).optional(), LLM_API_KEY: z.string().min(1).optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  WEB_DIST_DIR: z.string().min(1).optional(),
}).superRefine((env, ctx) => {
  if (env.LLM_PROVIDER !== "mock") for (const key of ["LLM_BASE_URL", "LLM_MODEL"] as const)
    if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `required when LLM_PROVIDER=${env.LLM_PROVIDER}` });
  if (env.LLM_PROVIDER === "openai" && !env.LLM_API_KEY)
    ctx.addIssue({ code: "custom", path: ["LLM_API_KEY"], message: "required when LLM_PROVIDER=openai" });
});
export type Config = z.infer<typeof envSchema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== "")); // compose passes ""
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`); // names only, never values
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  return parsed.data;
}
```
Export `envSchema` too (`envSchema.shape` is available after `superRefine` in Zod 4.6) so a test can diff keys with `.env.example`. Variable names/defaults come from `docs/ARCHITECTURE.md:135-148` (PORT, MONGO_URL, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY/S3_SECRET_KEY, S3_FORCE_PATH_STYLE, LLM_PROVIDER, LLM_BASE_URL, LLM_MODEL, LLM_API_KEY, LLM_TIMEOUT_MS); `NODE_ENV` and `WEB_DIST_DIR` are additions that must also appear in `.env.example`.

### API `db/mongo.ts` and `storage/s3.ts` (verified against the live dev Mongo/Silo)
```ts
// mongo.ts
export async function connectMongo(url: string) {
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
  await client.connect();
  const db = client.db();                       // db name from URL path (/tfm)
  await db.collection("applications").createIndexes([
    { key: { status: 1 }, name: "status_1" },
    { key: { updatedAt: -1 }, name: "updatedAt_-1" },
    { key: { "tags.label": 1 }, name: "tags.label_1" },
    { key: { title: "text", company: "text" }, name: "title_company_text" /* see Open Question 5 */ },
  ]);
  return { client, db };
}
export const pingMongo = async (db: Db) => { try { await db.command({ ping: 1 }); return true; } catch { return false; } };
// s3.ts
export const createS3Client = (c: Config) => new S3Client({ endpoint: c.S3_ENDPOINT, region: c.S3_REGION, forcePathStyle: c.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: c.S3_ACCESS_KEY, secretAccessKey: c.S3_SECRET_KEY }, maxAttempts: 1 });
export async function ensureBucket(s3: S3Client, bucket: string) {
  try { await s3.send(new HeadBucketCommand({ Bucket: bucket })); }
  catch (err) {
    if (!(err instanceof S3ServiceException) || err.$metadata.httpStatusCode !== 404) throw err;
    try { await s3.send(new CreateBucketCommand({ Bucket: bucket })); }
    catch (e) { if (!(e instanceof S3ServiceException) || !["BucketAlreadyOwnedByYou","BucketAlreadyExists"].includes(e.name)) throw e; } // raced with s3-init
  }
}
```

### API `app.ts` (final, verified; see Pattern 3/4) and `main.ts`
`probe()` helper, `createApp(deps)`, `onError`, top-level `notFound` as in Patterns 3–5. `main.ts`: `loadConfig()` → `await connectMongo()` → `createS3Client` + `await ensureBucket()` → `createLlmClient(config)` → `createApp({ pingMongo, pingS3, pingLlm: () => llm.ping(), webDistDir })` → `serve({ fetch: app.fetch, port: config.PORT })`; SIGINT/SIGTERM close server and Mongo client. `webDistDir = config.WEB_DIST_DIR ?? (NODE_ENV === "production" ? resolve(here, "../../web/dist") : undefined)`. Top-level await requires `module: NodeNext` + `"type": "module"` (both set).
`LlmClient` per `docs/AI-EXTRACTION.md:34-38`: `extractStructured<T>(system, input, schema): Promise<T>` and `ping(): Promise<boolean>`; Phase 1: `mock` complete (fixed `OfferExtraction` after 300 ms), `ollama`/`openai` real `ping()` (URLs above, `AbortSignal.timeout(2000)`) and `extractStructured` throwing `ApiError(502, "LLM_ERROR", "not implemented")`.

### Web: `vite.config.ts` / `vitest.config.ts` / test setup
```ts
// vite.config.ts
export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { conditions: ["@tfm/source", "module", "browser", "development|production"], tsconfigPaths: true },
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } } },
});
// vitest.config.ts
export default defineConfig({
  resolve: { conditions: ["@tfm/source", "module", "browser", "development|production"], tsconfigPaths: true },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], include: ["src/**/*.test.{ts,tsx}"], css: false },
});
// src/test/setup.ts
import "@testing-library/jest-dom/vitest"; import { cleanup } from "@testing-library/react"; import { afterEach, beforeEach, vi } from "vitest";
beforeEach(() => { vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })); vi.stubGlobal("scrollTo", vi.fn()); });
afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.className = ""; vi.unstubAllGlobals(); });
```
Pre-hydration script in `index.html` `<head>`:
```html
<script>
  (function () { try {
    var t = localStorage.getItem("expediente-theme");
    var dark = t === "dark" || ((t === null || t === "system") && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {} })();
</script>
```
`main.tsx` calls `initTheme()` once, then renders `<RouterProvider router={router} />` and imports `./styles.css`.

### Web: `AppLayout` essentials (verified by Testing Library: Sheet opens, theme persists)
Desktop `aside` is `hidden lg:flex` (Tailwind `lg` = 1024 px) with `bg-sidebar text-sidebar-foreground`, brand «Expediente» in `font-serif`, `<nav aria-label="Principal">`: `Link to="/applications"` (class `data-[status=active]:…`), «Tablero» and «Documentos» as `aria-disabled` spans with «Próximamente»; `ThemeToggle` at the bottom. Mobile `header lg:hidden` holds `<Sheet><SheetTrigger asChild><Button aria-label="Abrir menú" …/></SheetTrigger><SheetContent side="left">…same Nav + ThemeToggle…</SheetContent></Sheet>`; include `SheetTitle` and a `SheetDescription className="sr-only"` (Radix a11y warning otherwise). Close the sheet on link click (`onNavigate`). Icons: `strokeWidth={1.5}`, `size-5` in nav (DESIGN.md).

### Web: `formatDate` / `formatMoney` (verified outputs)
```ts
export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", ...(timeZone ? { timeZone } : {}) })
    .formatToParts(new Date(iso))
    .map((p) => (p.type === "month" && !p.value.endsWith(".") ? `${p.value}.` : p.value)).join("");
}
export function formatMoney(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 0, useGrouping: "always" }).format(amount);
}
// tests: formatDate("2026-10-12T10:00:00.000Z","UTC") === "12 oct. 2026"; "2026-09-05…" === "5 sept. 2026";
//        formatMoney(52000) === "52.000 €"; formatMoney(5200) === "5.200 €"
```
Known caveat: CLDR abbreviation for May is `may` → `may.` (RAE writes `may.`; acceptable, keep).

### Web: `http-client.ts` (typed fetch, contract-parsed errors; compiled and tested with a stubbed `fetch`)
`request<T>(path, schema, { method?, body?, signal? })`: network failure → `HttpError(0,"NETWORK_ERROR")`; `AbortError` rethrown untouched (hooks ignore it); non-2xx → parse with `errorResponseSchema` → `HttpError(status, code, message, details)`, otherwise `HttpError(status,"INVALID_RESPONSE")`; 204 → `schema.parse(undefined)`; success body validated with the contracts schema (`healthSchema` in the Phase 1 test).

### Dockerfile and compose.yml (verified)
```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.23.2
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build
FROM node:${NODE_VERSION}-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --workspace=@tfm/api --include-workspace-root
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --from=build --chown=node:node /app/packages/contracts/package.json packages/contracts/package.json
COPY --from=build --chown=node:node /app/packages/contracts/dist packages/contracts/dist
COPY --from=build --chown=node:node /app/apps/api/package.json apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /app/apps/web/dist apps/web/dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "apps/api/dist/main.js"]
```
`.dockerignore`: `.git .github .claude .planning .devcontainer gsd docs node_modules **/node_modules **/dist **/*.tsbuildinfo .env .env.* !.env.example compose.yml Dockerfile *.md` (ensures no secret or foreign code in the image; `.env` never copied).
```yaml
name: expediente
services:
  app:
    build: .
    image: tfm-app
    ports: ["8080:8080"]            # consider "127.0.0.1:8080:8080" (Open Question 4)
    environment:
      PORT: "8080"
      MONGO_URL: mongodb://mongo:27017/tfm
      S3_ENDPOINT: http://s3:9000
      S3_REGION: us-east-1
      S3_BUCKET: tfm-assets
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-minioadmin}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-minioadmin}
      S3_FORCE_PATH_STYLE: "true"
      LLM_PROVIDER: ${LLM_PROVIDER:-ollama}
      LLM_BASE_URL: ${LLM_BASE_URL:-http://ollama:11434}
      LLM_MODEL: ${LLM_MODEL:-gemma4:e2b}
      LLM_API_KEY: ${LLM_API_KEY:-}
      LLM_TIMEOUT_MS: ${LLM_TIMEOUT_MS:-90000}
    depends_on:                      # NOT ollama / ollama-init
      mongo: { condition: service_healthy }
      s3: { condition: service_healthy }
      s3-init: { condition: service_completed_successfully }
    restart: unless-stopped
  mongo:
    image: mongo:8.0.32
    volumes: [mongo-data:/data/db]
    healthcheck: { test: ["CMD","mongosh","--quiet","--eval","db.adminCommand('ping').ok"], interval: 5s, timeout: 5s, retries: 10, start_period: 10s }
    restart: unless-stopped
  s3:
    image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: "${S3_ACCESS_KEY:-minioadmin}", MINIO_ROOT_PASSWORD: "${S3_SECRET_KEY:-minioadmin}" }
    ports: ["127.0.0.1:9001:9001"]   # console with default creds: loopback only
    volumes: [s3-data:/data]
    healthcheck: { test: ["CMD","curl","-fsS","http://localhost:9000/minio/health/live"], interval: 5s, timeout: 5s, retries: 10, start_period: 5s }
    restart: unless-stopped
  s3-init:
    image: pgsty/mc:RELEASE.2026-09-16T00-00-00Z
    depends_on: { s3: { condition: service_healthy } }
    restart: "no"
    entrypoint: ["/bin/sh","-c","mc alias set local http://s3:9000 \"$${S3_ACCESS_KEY}\" \"$${S3_SECRET_KEY}\" && mc mb --ignore-existing local/tfm-assets"]
    environment: { S3_ACCESS_KEY: "${S3_ACCESS_KEY:-minioadmin}", S3_SECRET_KEY: "${S3_SECRET_KEY:-minioadmin}" }
  ollama:
    image: ollama/ollama:0.40.3
    volumes: [ollama-data:/root/.ollama]
    healthcheck: { test: ["CMD","ollama","list"], interval: 10s, timeout: 5s, retries: 10, start_period: 10s }
    restart: unless-stopped
  ollama-init:
    image: ollama/ollama:0.40.3
    depends_on: { ollama: { condition: service_healthy } }
    restart: "no"
    environment: { OLLAMA_HOST: "ollama:11434", LLM_MODEL: "${LLM_MODEL:-gemma4:e2b}" }
    entrypoint: ["/bin/sh","-c","ollama pull \"$${LLM_MODEL}\""]
volumes: { mongo-data: {}, s3-data: {}, ollama-data: {} }
```
Binary availability (verified by running them): `mongo:8` has `mongosh` (2.13.0), **no** curl/wget/nc; `pgsty/minio` has `curl`, `bash`, `sh`, no `wget`/`nc`; `pgsty/mc` has `sh`/`bash`, **no** curl/wget; `ollama/ollama` has `ollama`, `sh`, `bash`, **no** curl/wget; `node:22-slim` has `node`, no curl/wget. Healthchecks above all reported `healthy`. Compose `$$` escapes are required inside `entrypoint` strings. Plain `docker compose up` works with no `.env` (all defaults inline); a root `.env` only overrides. Typical first pull of `gemma4:e2b` is 4.6 GB (the pull speed in the prototype was ~9 MB/s ≈ 8–9 min; real time depends on the network) [measured speed for a different 45 MB model; extrapolation ASSUMED].

### `.env.example` (skeleton; every variable the system reads)
```bash
# --- API runtime (apps/api/src/config.ts) ---
NODE_ENV=development
PORT=3000
MONGO_URL=mongodb://mongo:27017/tfm
S3_ENDPOINT=http://s3:9000
S3_REGION=us-east-1
S3_BUCKET=tfm-assets
# DEV-ONLY default credentials of the local Silo/MinIO container. Never reuse outside local development.
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
# ollama | openai | mock  (use mock for tests and as the demo fallback)
LLM_PROVIDER=ollama
LLM_BASE_URL=http://ollama:11434
LLM_MODEL=gemma4:e2b
# Only for LLM_PROVIDER=openai. Put the real key in .env, never here.
LLM_API_KEY=
LLM_TIMEOUT_MS=90000
# Optional: absolute path of the built web app (defaults to ../../web/dist next to apps/api/dist in production)
# WEB_DIST_DIR=
```

## Runtime State Inventory

Not applicable — greenfield phase (no rename/refactor/migration). Nothing in Mongo, Silo, OS registrations or build artifacts predates this phase. (Side-effect note: research probes briefly created `tfm.applications`, a `research_probe` DB and a `research-probe` bucket on the shared dev services; all were removed.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `typescript` latest + typescript-eslint | TS **6.0.3** until typescript-eslint supports TS ≥7.1 | TS 7.0 GA 2026-07 | Pin 6.x |
| ESLint `.eslintrc`, `eslint-config-prettier` | ESLint 10 flat config via `defineConfig`/`globalIgnores` from `eslint/config`; no prettier-config needed | ESLint 9→10 | Config shown above |
| Vite 5/6 + `vite-tsconfig-paths` | Vite 8 (Rolldown) with `resolve.tsconfigPaths` | Vite 8 | One option |
| `@radix-ui/react-*` per component | single `radix-ui` package | shadcn new-york | Matches generated code |
| shadcn components import `clsx`+`twMerge` locally | registry now imports `cn` package | 2026-10 (cn 0.5.0 2026-10-16) | Post-step rewrite (Pitfall 4) |
| `baseUrl` + `paths` | `paths` only | TS 6 | Never set `baseUrl` |
| npm 10 resolves vitest peers | npm 10.9.x crashes on vitest ≥4.1 | 2026 | `.npmrc` workaround |

**Deprecated/outdated:** `eslint-plugin-react-hooks` `recommended-latest` name (use `configs.flat.recommended`); TanStack `TanStackRouterVite` import (use `tanstackRouter`); Tailwind `tailwind.config.js` (leave `components.json` `tailwind.config` empty).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ollama/ollama:0.40.3` can pull and serve `gemma4:e2b` (only 0.40.11 was exercised; Gemma 4 needs Ollama ≥0.22 per secondary web sources) | Container images | `ollama-init` fails on a clean machine → pin a newer tag after the 2-week window or test a pull in plan 3 |
| A2 | `gemma4:e2b` needs roughly 6–8 GB RAM at runtime (only the 4.6 GB download is verified) | Summary / Open Questions | Demo laptop may swap; mock fallback exists |
| A3 | First-run pull time (~minutes) extrapolated from a 9 MB/s test with another model | Pattern 9 | README wording only |
| A4 | VS Code `forwardPorts: 8080` intercepts host port 8080 and caused the failed `curl` from the devcontainer | Pitfall 11 | Only affects how the smoke step is documented; the `compose exec` workaround is verified |
| A5 | Binding `127.0.0.1:9001:9001` / `127.0.0.1:8080:8080` behaves as standard compose loopback publishing (syntax not executed; only `0.0.0.0` mapping was run) | Compose / Security | Console/app unreachable if wrong; trivial to revert |
| A6 | TS 7 will not work with typescript-eslint until 7.1 (from secondary articles; peer range itself is verified) | Pitfall 2 | Only affects when to upgrade |
| A7 | Rendered visual correctness (no theme flash, sidebar at exactly 1024 px, font rendering, contrast) — code verified, browser rendering not | Validation Architecture (manual rows) | Needs the human check listed there |
| A8 | `may.` for May is acceptable to the author | Code Examples | Cosmetic |

## Open Questions

1. **Branch naming vs config (STATE.md concern 2 — flag only).** `.planning/config.json` has `git.phase_branch_template: "gsd/phase-{phase}-{slug}"` and `branching_strategy: "none"`, while CLAUDE.md mandates `phase/NN-nombre` (here `phase/01-fundaciones`). Not a research matter; the user/config owner must reconcile before the first branch or `/gsd-ship`. Recommendation: set the template to `phase/{phase}-{slug}` (or create the branch manually).
2. **Model tag (STATE.md concern 1 — RESOLVED).** `gemma4:e2b` exists in the official ollama.com library (128K context, text+image(+audio), Q4_K_M 3.5 GB main blob, 4.6 GB total package) [CITED: ollama.com/library/gemma4, ollama.com/library/gemma4:e2b]; dev Ollama already holds it (`/api/tags`: `"size":4587156505`) [VERIFIED]. Closest alternatives if ever needed: `gemma4:e2b-it-qat` (4.3 GB), `gemma4:e4b` (larger). Phase 3 note: Gemma 4 is thinking-capable; the model page says thinking is toggled by a `<|think|>` token in the system prompt and that for E2B disabling does not emit an empty thought block [CITED] — verify `think:false`/format behaviour in Phase 3.
3. **Devcontainer parity.** `.devcontainer/docker-compose.yml` uses `mongo:8` (8.3.13) and `:latest` for minio/mc/ollama, so dev and deliverable can diverge. Recommend (user decision) aligning it to the compose pins; not required for Phase 1 to pass.
4. **Port exposure.** The app has no auth by design. Silo console (default creds) should be loopback-only; the app port can be `8080:8080` (reachable from other devices on the LAN) or `127.0.0.1:8080:8080`. Recommendation: loopback for both unless the defense machine is remote.
5. **Mongo text index language.** ARCHITECTURE.md only says "texto en `{ title, company }`". Default language is English; Spanish stemming or `none` changes matching for APP-06 (Phase 2). Recommendation: `default_language: "none"` (job titles/companies are mixed ES/EN and Phase 2 should not rely on stemming), decide now because option changes later throw `IndexOptionsConflict`. Phase 2 may also prefer a case-insensitive regex.
6. **4-digit amounts.** Spanish CLDR does not group 4-digit numbers («5200 €»); recommendation `useGrouping:"always"` («5.200 €») to match the DS example style. Confirm with the author.
7. **`@tanstack/react-form` (1.33.5)** is in the closed stack but unused in Phase 1: recommend installing it in Phase 2 with its first form to keep Phase 1's dependency justification minimal.
8. **`legacy-peer-deps`.** If the author prefers a clean peer resolution, the alternative is to bump npm to 11 in the devcontainer (`npm i -g npm@11`) and Dockerfile; this contradicts CLAUDE.md's "npm 10", hence an ADR.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v22.23.3 | — |
| npm | install | ✓ | 10.9.9 (has the vitest≥4.1 peer bug → `.npmrc`) | npm 11.21.1 via `npx -y npm@11` |
| Docker engine / compose | FND-08, D-23 | ✓ (host daemon via DooD) | Docker 29.8.0 / Compose v5.6.1 | — |
| Network (npm, Docker Hub, ollama.com) | install, pulls | ✓ | — | — |
| Dev services (`mongo`, `s3`, `ollama`) | `npm run dev`, health | ✓ reachable by service name | mongod 8.3.13; Silo `RELEASE.2026-08-04`; Ollama 0.40.11 with `gemma4:e2b` | — |
| `curl` in devcontainer | manual probes | ✓ | — | — |
| Host-side browser access to compose app | manual UAT | ✓ on the host (not testable here) | — | `docker compose exec -T app node -e …` |

**Missing dependencies with no fallback:** none. **With fallback:** published-port curl from the devcontainer (use `compose exec`).

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 (+ Testing Library 16.3.3 / jest-dom 7.0.1 / jsdom 30.1.2 for web) |
| Config files | `apps/api/vitest.config.ts` (node, `ssr.resolve` conditions), `apps/web/vitest.config.ts` (jsdom, setup file), contracts uses defaults — all created in Wave 0 |
| Quick run command | `npm run typecheck && npm run test` (≈15–25 s on the prototype; each workspace also `npm run test -w @tfm/<ws>`) |
| Full suite command | `npm run typecheck && npm run lint && npm run test && npm run build` then the compose smoke below |

### Phase Requirements → Test Map
| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| FND-01 / SC1 | install+build+test+lint+typecheck pass from root | integration | `npm ci && npm run build && npm run test && npm run lint && npm run typecheck && npm run format:check` (exit 0) | ❌ Wave 0 (root scaffold) |
| FND-02 / SC1 | web+API import every model from `@tfm/contracts`; no local redefinition | unit + grep | `npm run test -w @tfm/contracts`; `! grep -rnE "z\.enum\(\[" apps --include=*.ts --include=*.tsx` (no enums outside contracts); web/api tests import `@tfm/contracts` (health, http-client) | ❌ Wave 0 |
| D-06 | schemas: defaults, bounds, salary order (error at `salaryMax`), tags ≤20, query coercion, error `details` optional, health shape | unit | `npm run test -w @tfm/contracts` (pass = all green) | ❌ Wave 0 `packages/contracts/src/*.test.ts` |
| FND-03 / SC3 | `/api/health` shape; each dep flips independently; always 200; never hangs | unit (`app.request`) | `npm run test -w @tfm/api` (cases: all ok; mongo false; s3 false; llm false; probe that never resolves ⇒ `"error"` within ~2.5 s with fake timers) | ❌ Wave 0 `apps/api/src/app.test.ts` |
| FND-03 / SC3 (real) | real connectivity | smoke | stack up: `docker compose up -d --build --wait --wait-timeout 300` then `docker compose exec -T app node -e "fetch('http://127.0.0.1:8080/api/health').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"` → `200 {"status":"ok","mongo":"ok","s3":"ok","llm":"ok"}`; then `docker compose stop mongo` (repeat) → `"mongo":"error"`, `docker compose start mongo`; same for `s3` | manual/scripted (no file) |
| FND-04 / SC3 | invalid env refuses to start; names not values in message; `""` treated as absent; openai requires key | unit | `npm run test -w @tfm/api` → `config.test.ts`: `loadConfig({})` throws listing `MONGO_URL…`; `loadConfig({...ok, LLM_API_KEY:""})` ok for ollama; openai without key throws | ❌ Wave 0 `apps/api/src/config.test.ts` |
| FND-04 / SC3 | error contract: 404 JSON on `/api/*`, 400 malformed JSON, 500 with no stack/message leak, `ApiError` mapping, ZodError → `VALIDATION_ERROR` with `details` | unit | same `app.test.ts` | ❌ Wave 0 |
| D-11 | static + SPA fallback, `/api/nope` stays JSON | unit | `app.test.ts` with a temp dir containing `index.html` + `assets/a.js` | ❌ Wave 0 |
| D-08 | indexes + `ensureBucket` idempotent | integration (needs dev services) | `node`/Vitest script guarded by `MONGO_URL` (skip when absent), run twice; or verified implicitly by the compose smoke (app starts twice via restart) | ❌ optional |
| D-09 | `mock` provider returns schema-valid `OfferExtraction` after delay; ollama/openai `ping()` URL/headers with stubbed `fetch`; mock ping true | unit | `npm run test -w @tfm/api` (`llm/*.test.ts`) | ❌ Wave 0 |
| FND-10 / SC3 | `.env.example` keys ⊇ all keys read by `envSchema` and compose | unit | test reads `../../.env.example`, parses `KEY=` lines (including commented `# WEB_DIST_DIR=`), asserts `Object.keys(envSchema.shape)` ⊆ keys | ❌ Wave 0 |
| FND-05 / SC4 | lands on `/applications`; nav landmark; menu button opens a dialog with the same nav; empty state text «Aún no has guardado ninguna oferta…» | component (RTL + memory router) | `npm run test -w @tfm/web` | ❌ Wave 0 `layouts/app-layout.test.tsx`, `routes` test |
| FND-05 / SC4 | sidebar visible ≥1024 px / hidden below | **manual** (CSS breakpoint not evaluated by jsdom) | open `localhost:5173` or `:8080`, resize across 1024 px | manual-only (justified: layout CSS) |
| FND-06 / SC5 | system default, persist, try/catch when storage throws, `dark` class, system change listener | unit | `npm run test -w @tfm/web` (`theme.test.ts`) | ❌ Wave 0 |
| FND-06 / SC5 | no flash on reload | **manual** | hard-reload in dark with throttled CPU; no light frame | manual-only |
| FND-07 / SC4 | tokens + fonts shipped | build + grep | `npm run build -w @tfm/web && grep -l "EB Garamond Variable" apps/web/dist/assets/*.css && grep -l "Source Sans 3 Variable" apps/web/dist/assets/*.css && grep -l "JetBrains Mono Variable" apps/web/dist/assets/*.css`; `diff docs/design/expediente.css apps/web/src/styles.css` (expect empty or Prettier-only) ; `! grep -rnE "#[0-9a-fA-F]{3,8}\b\|bg-(red\|blue\|green\|gray)-" apps/web/src --include=*.tsx` | ❌ Wave 0 |
| D-19 | `formatDate`/`formatMoney` exact strings | unit | `npm run test -w @tfm/web` (`format.test.ts`: «12 oct. 2026», «5 sept. 2026», `"52.000 €"`, `"5.200 €"`) | ❌ Wave 0 |
| D-16 | http-client parses success/error/network | unit | `http-client.test.ts` | ❌ Wave 0 |
| FND-08 / SC2 | compose valid, no `latest`, images pinned, all healthy, app reachable | config + smoke | `docker compose config -q`; `! grep -nE "image:.*:latest" compose.yml`; `docker compose up -d --build --wait --wait-timeout 300`; `docker compose ps --format '{{.Service}} {{.State}} {{.Health}}'` (app/mongo/s3/ollama = running healthy; s3-init exited 0; ollama-init may still be running); `docker compose exec -T app id` → `uid=1000(node)`; `docker compose exec -T app node -e "fetch('http://127.0.0.1:8080/applications/1').then(async r=>console.log(r.status,(await r.text()).includes('<div id=\"root\">')))"` → `200 true` | manual/scripted |
| FND-09 / SC1 | hook rejects lint/format/type errors | scripted check | `printf 'export const x: any = 1;\n' > apps/api/src/__bad.ts && git add apps/api/src/__bad.ts && ! git commit -m "test: bad" ; git reset -q HEAD apps/api/src/__bad.ts; rm apps/api/src/__bad.ts` (the commit must fail); pre-push: `.husky/pre-push` runs `npm run typecheck` | manual-once |

### Sampling Rate
- **Per task commit:** `npm run typecheck && npm run test` (CLAUDE.md rule) plus the workspace-specific test of the touched package.
- **Per wave merge:** `npm run typecheck && npm run lint && npm run test && npm run build`.
- **Phase gate:** full suite + compose smoke (rows FND-03 real, FND-08) + the three manual rows, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Root: `package.json`, `.npmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*`, `.gitignore`, `.gitattributes`, `.dockerignore`, `.env.example`; commit `package-lock.json`.
- [ ] `packages/contracts/src/*.schema.ts` + `*.test.ts`.
- [ ] `apps/api/vitest.config.ts`, `src/app.test.ts`, `src/config.test.ts`, `src/llm/*.test.ts`.
- [ ] `apps/web/vitest.config.ts`, `src/test/setup.ts`, `src/common/lib/format.test.ts`, `src/core/theme/theme.test.ts`, `src/core/http/http-client.test.ts`, `src/layouts/app-layout.test.tsx`.
- [ ] Framework install: `npm install` with the exact pins (needs `.npmrc` first).

## Security Domain

`security_enforcement` is enabled, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app by product decision (no login); stated explicitly, not an omission |
| V3 Session Management | no | No sessions |
| V4 Access Control | no (documented) | No users; `ownerId` reserved. Mitigation by exposure: loopback publishing for Silo console, no published Mongo/Ollama ports |
| V5 Input Validation | yes | Zod schemas from `@tfm/contracts`; env validated at startup; `ZodError`/`SyntaxError` → 400 |
| V6 Cryptography | no | No crypto in this phase; never hand-roll |
| V7 Error handling & logging | yes | Generic 500 body, no stack in responses; log `err.message` only; never log request bodies / offer text |
| V10/V14 Config, dependencies, build | yes | Exact pins + committed lockfile + `npm ci`; pinned image tags (no `latest`); non-root runtime; `.env` ignored and excluded by `.dockerignore`; `.env.example` has no real secrets |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stack trace / internal message leak in 500 | Information disclosure | Central `onError` returns `{ code: "INTERNAL_ERROR", message: "Error interno" }` (test asserts the secret text is absent) |
| Secrets in repo/image/logs | Information disclosure | `.env` gitignored + dockerignored; compose defaults are dev-only `minioadmin` (flagged in `.env.example`); config error prints variable names only |
| Default credentials exposed (Silo console 9001) | Elevation of privilege | Publish on `127.0.0.1` only; do not publish 9000/27017/11434 |
| Static path traversal / double-decoding | Tampering | `serveStatic` with fixed absolute root; keeps the default `allowPercentInPath: false` [CITED: @hono/node-server README] |
| Supply-chain: unvetted/new packages (e.g. `cn` 0.5.0 injected by the shadcn CLI) | Tampering | Exact pins ≥2 weeks old, review `git diff package.json package-lock.json` after any CLI that touches deps, legitimacy audit above |
| Root container | Elevation of privilege | `USER node` (uid 1000) verified; no extra capabilities; `HEALTHCHECK` without shell tools |
| Cross-origin access | Spoofing | Same-origin in prod, Vite proxy in dev → add **no** CORS middleware |
| SSRF via configurable `LLM_BASE_URL` | Tampering | Value comes only from env (operator-controlled), never from request data |
| Unbounded health probes (DoS of the health endpoint) | Denial of service | 2.5 s per-probe cap, parallel, no retries |

## Sources

### Primary (HIGH confidence)
- Prototype built and executed in this session (scratchpad, outside the repo): npm install/ci (npm 10.9.9 and 11.21.1), tsc 6.0.3, ESLint 10.12.0, Prettier 3.9.10, Husky 9.1.7 + lint-staged 17.6.0, Vitest 5.0.4, Vite 8.3.4 dev+build, `docker build`, `docker compose up --wait`, stop/start of mongo/s3/ollama.
- npm registry (`npm view … time/peerDependencies/engines`) for every version and peer range; Docker Hub tags API; `docker manifest inspect`; live Ollama `/api/tags` and `/api/version` on the dev service.
- Repo docs read this session: `docs/ARCHITECTURE.md`, `DOMAIN.md`, `DESIGN.md`, `AI-EXTRACTION.md`, `design/expediente.css`, `.devcontainer/*`, `.planning/{REQUIREMENTS,STATE,ROADMAP,config}`.
- Official docs: https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ (TS 6 defaults/deprecations); https://tanstack.com/router/latest/docs/framework/react/installation/with-vite (plugin order, gen-file exclusion); https://hono.dev/docs/getting-started/nodejs (serveStatic root/cwd, serve); `@hono/node-server` README in `node_modules`; https://ui.shadcn.com/docs/installation/vite and https://ui.shadcn.com/docs/components-json and https://ui.shadcn.com/schema.json (components.json fields/styles); https://ui.shadcn.com/r/styles/new-york-v4/button.json (registry now imports `cn`).
- https://ollama.com/library/gemma4 and https://ollama.com/library/gemma4:e2b (tag, sizes, context, thinking notes).

### Secondary (MEDIUM confidence)
- WebSearch on TypeScript 7 / typescript-eslint incompatibility (openreplay, dev.to, ecorpit, syncfusion articles) — consistent with the verified peer range.
- WebSearch on minimum Ollama version for Gemma 4 (gemma4all.com says 0.20+, verdent.ai says 0.22+).

### Tertiary (LOW confidence)
- RAM and pull-time estimates (A2, A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — resolved from the registry and installed/exercised together.
- Architecture: HIGH — prototype ran the same shape end to end, incl. Docker and live dependency stop/start.
- Pitfalls: HIGH for 1–10, 12–14 (reproduced); MEDIUM for 11 (root cause hypothesised).
- Visual/UX outcomes (flash, breakpoint rendering): MEDIUM — code verified, browser not driven.

**Research date:** 2026-10-28
**Valid until:** 2026-11-04 (7 days — this ecosystem moves daily; re-resolve pins only if planning slips past the defense schedule; the defense is 2026-11-09)
