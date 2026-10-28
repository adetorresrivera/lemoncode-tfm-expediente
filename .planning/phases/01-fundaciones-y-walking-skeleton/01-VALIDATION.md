---
phase: "01"
slug: "fundaciones-y-walking-skeleton"
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 01-XX | TBD | TBD | FND-01 | — | N/A | integration | `npm ci && npm run build && npm run test && npm run lint && npm run typecheck && npm run format:check` | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-02 / D-06 | — | N/A | unit + grep | `npm run test -w @tfm/contracts`; `! grep -rnE "z\.enum\(\[" apps --include=*.ts --include=*.tsx` | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-03 | — | health never hangs, always 200 | unit | `npm run test -w @tfm/api` (`app.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-03 (real) | — | N/A | smoke | `docker compose up -d --build --wait --wait-timeout 300` + `docker compose exec -T app node -e "fetch('http://127.0.0.1:8080/api/health')..."` | manual/scripted | ⬜ pending |
| 01-XX | TBD | TBD | FND-04 | env errors name keys, not values; no stack leak | unit | `npm run test -w @tfm/api` (`config.test.ts`, `app.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | D-09 | — | N/A | unit | `npm run test -w @tfm/api` (`llm/*.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | D-11 | — | N/A | unit | `npm run test -w @tfm/api` (static + SPA fallback) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-10 | no secrets in `.env.example` | unit | `.env.example` keys ⊇ `envSchema` keys test | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-05 | — | N/A | component | `npm run test -w @tfm/web` (`app-layout.test.tsx`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-06 | storage failure tolerated | unit | `npm run test -w @tfm/web` (`theme.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-07 | — | N/A | build + grep | `npm run build -w @tfm/web && grep -l "EB Garamond Variable" apps/web/dist/assets/*.css` (+ Source Sans 3, JetBrains Mono); no hex colours in `.tsx` | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | D-19 | — | N/A | unit | `npm run test -w @tfm/web` (`format.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | D-16 | — | N/A | unit | `npm run test -w @tfm/web` (`http-client.test.ts`) | ❌ W0 | ⬜ pending |
| 01-XX | TBD | TBD | FND-08 | pinned images, non-root | config + smoke | `docker compose config -q`; `! grep -nE "image:.*:latest" compose.yml`; `docker compose exec -T app id` → `uid=1000(node)` | manual/scripted | ⬜ pending |
| 01-XX | TBD | TBD | FND-09 | — | N/A | scripted | bad commit is rejected by pre-commit; `.husky/pre-push` runs `npm run typecheck` | manual-once | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs/plans are filled in once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] Root: `package.json`, `.npmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.lintstagedrc.json`, `.husky/*`, `.gitignore`, `.gitattributes`, `.dockerignore`, `.env.example`; commit `package-lock.json`
- [ ] `packages/contracts/src/*.schema.ts` + `*.test.ts`
- [ ] `apps/api/vitest.config.ts`, `src/app.test.ts`, `src/config.test.ts`, `src/llm/*.test.ts`
- [ ] `apps/web/vitest.config.ts`, `src/test/setup.ts`, `src/common/lib/format.test.ts`, `src/core/theme/theme.test.ts`, `src/core/http/http-client.test.ts`, `src/layouts/app-layout.test.tsx`
- [ ] Framework install: `npm install` with exact pins (needs `.npmrc` first)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar visible ≥1024 px, hidden below with menu button | FND-05 | CSS breakpoints are not evaluated by jsdom | Open `localhost:5173` or `:8080`, resize across 1024 px |
| No theme flash on reload | FND-06 | Needs real paint | Hard-reload in dark with throttled CPU; no light frame |
| Pre-commit hook rejects bad commit | FND-09 | Mutates git index | Stage a file with `any`, attempt commit, expect failure, then reset |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
