---
phase: "01"
slug: "fundaciones-y-walking-skeleton"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-28"
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (+ Testing Library 16.3.3 / jest-dom 7.0.1 / jsdom 30.1.2 for web) |
| **Config file** | `apps/api/vitest.config.ts` (node, `ssr.resolve` conditions), `apps/web/vitest.config.ts` (jsdom, setup file); contracts uses defaults — all created in Wave 0 |
| **Quick run command** | `npm run typecheck && npm run test` |
| **Full suite command** | `npm run typecheck && npm run lint && npm run test && npm run build` + compose smoke |
| **Estimated runtime** | ~25 seconds (quick), compose smoke up to ~300 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck && npm run test` plus `npm run test -w @tfm/<ws>` of the touched package
- **After every plan wave:** Run `npm run typecheck && npm run lint && npm run test && npm run build`
- **Before `/gsd-verify-work`:** Full suite + compose smoke + manual-only rows must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | FND-01 / FND-08 | T-01-04, T-01-05, T-01-SC | pinned images, non-root, loopback ports | integration + smoke | `npm ci && npm run build && npm run typecheck`; `bash scripts/compose-smoke.sh --down` | ✅ | ✅ green |
| 01-01-T1 | 01-01 | 1 | FND-03 (real) | T-01-03 | health never hangs, always 200 | smoke | `bash scripts/compose-smoke.sh --down` (health ok, mongo/s3 stop → error → start → ok) | ✅ | ✅ green |
| 01-01-T2 | 01-01 | 1 | FND-03 / D-12 | T-01-03 | hung probe → `"error"` within 2.5 s | unit | `npm run test -w @tfm/api` (`app.test.ts`) | ✅ | ✅ green |
| 01-01-T2 | 01-01 | 1 | FND-04 / D-07 / D-10 | T-01-01, T-01-02 | env errors name keys, not values; no stack leak | unit | `npm run test -w @tfm/api` (`config.test.ts`, `app.test.ts`) | ✅ | ✅ green |
| 01-01-T2 | 01-01 | 1 | D-11 | T-01-06 | static root fixed, SPA fallback only for non-/api | unit | `npm run test -w @tfm/api` (static + SPA fallback cases; `static root is fixed (T-01-06)` traversal variants) | ✅ | ✅ green |
| 01-01-T2 | 01-01 | 1 | FND-10 / D-05 | T-01-07 | no secrets in `.env.example` | unit | `config.test.ts` (`.env.example` keys ⊇ `envSchema` keys; `LLM_API_KEY=` empty) | ✅ | ✅ green |
| 01-02-T1 | 01-02 | 2 | FND-01 (lint/format) | — | N/A | lint + format | `npm run lint && npm run format:check` | ✅ | ✅ green |
| 01-02-T2 | 01-02 | 2 | FND-09 / D-04 (typecheck moved to pre-commit by user, 2026-10-28) | T-01-10 | bad commit rejected: lint error and type error | scripted | two self-cleaning hook probes (`bash -c '…git commit…'`): explicit any must be rejected; a lint-clean type error must be rejected with "error TS" in the hook output; both leave HEAD unchanged and no probe file. `.husky/pre-commit` runs `npx lint-staged` then `npm run typecheck`; `.husky/pre-push` runs `npm run test` | ✅ | ✅ green |
| 01-03-T1/T2 | 01-03 | 3 | FND-02 / D-06 | T-01-12, T-01-13 | bounded inputs; http/https-only sourceUrl | unit + grep | `npm run test -w @tfm/contracts`; z.enum placement gate (no `z.enum(` under `apps/` except `apps/api/src/config.ts`) | ✅ | ✅ green |
| 01-03-T3 | 01-03 | 3 | D-09 | T-01-14, T-01-15, T-01-16 | key never logged; ping bounded | unit | `npm run test -w @tfm/api` (`llm/llm.client.test.ts`; `bounds ping with an AbortSignal…` per provider) | ✅ | ✅ green |
| 01-04-T1 | 01-04 | 4 | FND-05 (landing) / D-13 / D-14 / D-18 | — | N/A | component + unit | `npm run test -w @tfm/web` (`core/router/router.test.tsx`, `pods/application-list/application-list.test.tsx`: mapper output and empty/non-empty component) | ✅ | ✅ green |
| 01-04-T2 | 01-04 | 4 | FND-07 / D-15 | — | N/A | build + grep | `cmp docs/design/expediente.css apps/web/src/styles.css`; `npm run build -w @tfm/web` + three font-family greps; no hex/palette classes in `.tsx` | ✅ | ✅ green |
| 01-04-T3 | 01-04 | 4 | D-16 (http) / D-19 | T-01-17, T-01-18 | only contract errors reach the UI | unit | `npm run test -w @tfm/web` (`http-client.test.ts`, `format.test.ts`); typecheck covers the typed `getApplications` in `pods/application-list/api/api.ts` | ✅ | ✅ green |
| 01-05-T1 | 01-05 | 5 | D-15 (shadcn) | T-01-20 | no `cn` package; DS tokens untouched | grep + cmp | `test ! -e node_modules/cn`; no cn import from the external package; `cmp` styles; palette gate | ✅ | ✅ green |
| 01-05-T2 | 01-05 | 5 | FND-06 / D-16 (theme) | T-01-21 | storage failure tolerated; unknown value → system | unit | `npm run test -w @tfm/web` (`theme.test.ts`) | ✅ | ✅ green |
| 01-05-T3 | 01-05 | 5 | FND-05 / D-17 | — | N/A | component | `npm run test -w @tfm/web` (`app-layout.test.tsx`) | ✅ | ✅ green |
| 01-06-T1 | 01-06 | 6 | D-22 | T-01-23 | creds documented as local-only | grep | README required-content greps | ✅ | ✅ green |
| 01-06-T2 | 01-06 | 6 | FND-01 / FND-08 / D-23 (phase gate, A1) | T-01-24, T-01-SC | app never waits for the model pull | integration + smoke | `npm ci && … && npm run build`; `rm -rf packages/contracts/dist && npm run typecheck && npm run test`; `bash scripts/compose-smoke.sh --with-model --down` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs are `{plan}-T{n}` from the PLAN.md files.*

---

## Wave 0 Requirements

- [x] Root: `package.json`, `.npmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*`, `.gitignore`, `.gitattributes`, `.dockerignore`, `.env.example`; commit `package-lock.json`
- [x] `packages/contracts/src/*.schema.ts` + `*.test.ts`
- [x] `apps/api/vitest.config.ts`, `src/app.test.ts`, `src/config.test.ts`, `src/llm/*.test.ts`
- [x] `apps/web/vitest.config.ts`, `src/test/setup.ts`, `src/common/lib/format.test.ts`, `src/core/theme/theme.test.ts`, `src/core/http/http-client.test.ts`, `src/layouts/app-layout.test.tsx`, `src/pods/application-list/application-list.test.tsx`
- [x] Framework install: `npm install` with exact pins (needs `.npmrc` first)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar visible ≥1024 px, hidden below with menu button | FND-05 | CSS breakpoints are not evaluated by jsdom | Open `localhost:5173` or `:8080`, resize across 1024 px (01-05-T3 human-check) |
| No theme flash on reload | FND-06 | Needs real paint | Hard-reload in dark with throttled CPU; no light frame (01-05-T3 human-check) |
| Pre-commit hook rejects bad commit (lint error and type error) | FND-09 | Mutates git index | Automated as two self-cleaning probes (lint, type) in 01-02-T2; re-run manually only if the hook changes |
| Host-side health and browser check | FND-08 / D-23 | Devcontainer cannot reach host-published ports (RESEARCH Pitfall 11) | On the host: `curl -s http://localhost:8080/api/health`, open `http://localhost:8080` and `http://localhost:9001` (01-06-T2 human-check) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 25s (contracts + api ~7 s; web ~70 s in this devcontainer because of jsdom start-up)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-29 (Nyquist audit: 16 covered, 2 partial closed, 0 missing)

## Validation Audit 2026-10-29

| Metric | Count |
|---|---|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |
