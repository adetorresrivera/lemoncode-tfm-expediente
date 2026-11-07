---
phase: "6"
slug: "pulido-de-demo"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-06"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.4 (contracts node; api node with real Mongo `tfm_test` + Silo `tfm-assets-test`, `fileParallelism: false`; web jsdom + Testing Library) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` (`setupFiles: ./src/test/setup.ts`), contracts defaults |
| **Quick run command** | `npm run test -w @tfm/api -- src/scripts` · `npm run test -w @tfm/web -- src/<path>` |
| **Full suite command** | `npm run typecheck && npm run test && npm run lint` |
| **Estimated runtime** | ~20 seconds warm (baseline: contracts 57, api 407, web 615 tests) |

---

## Sampling Rate

- **After every task commit:** Run the touched workspace's targeted command
- **After every plan wave:** Run `npm run typecheck && npm run test && npm run lint`
- **Before `/gsd-verify-work`:** Full suite + `npm run build` + `bash scripts/compose-smoke.sh --down` + `bash scripts/compose-smoke.sh --cold` must be green
- **Max feedback latency:** 30 seconds (targeted), compose smoke excluded

---

## Per-Task Verification Map

Filled by the planner/executor per PLAN.md. Requirement → test map from RESEARCH:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| DEMO-01 | `buildSeedPlan` shape (12 apps, all statuses, 3 with rounds, dates in window, no mock-draft collisions) | unit | `npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts` | ✅ | ✅ green |
| DEMO-01 | Two runs leave 12 seed apps / 3 docs, histories coherent, `--reset` wipes all, `seed` not exposed | integration | `npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts` | ✅ | ✅ green |
| DEMO-01 / DEMO-05 | Seed + mock extraction work in the image after cold start | compose smoke | `bash scripts/compose-smoke.sh --cold` | ✅ | ✅ green |
| DEMO-02 | README covers run/seed/`--reset`/mock/`LLM_MODEL`/fixtures, no phase notes | grep | `grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md` | ✅ | ✅ green |
| DEMO-03 | 360 px risk-point guards on screens S1-S11 (D-12) plus shell class backstops | component | `npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common` | ✅ | ✅ green |
| DEMO-03 / DEMO-04 | Loading, error and empty states of list, detail, form and documents (D-11) | component | `npm run test -w @tfm/web -- src/test/view-states.test.tsx` | ✅ | ✅ green |
| DEMO-04 | axe (non-contrast) on list, detail, form, documents, dialog, Sheet, error screens | component | `npm run test -w @tfm/web -- src/test src/core/router` | ✅ | ✅ green |
| DEMO-04 | AA contrast of token pairs, light and dark | unit | `npm run test -w @tfm/web -- src/common/lib/contrast.test.ts` | ✅ | ✅ green |
| DEMO-06 | Mapper gaps closed, DOMAIN rules traced, 05 WR-01 stable | unit/component | `npm run test -w @tfm/web -- src/pods` · `npm run test -w @tfm/api -- src/applications src/documents` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Per-task rows (06-01 … 06-17)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-T1 | 06-01 | 1 | DEMO-01, DEMO-05 | T-06-01, T-06-02, T-06-03, T-06-04 | Tracer — npm run seed loads one linked CV and one application through the services into Mongo and Silo, and a second run replaces them | unit | C99 · C100 | ✅ | ✅ green |
| 06-02-T1 | 06-02 | 2 | DEMO-01, DEMO-05 | T-06-05, T-06-06, T-06-07, T-06-30 | The pure plan describes the 12-application, 3-document demo list with every display case of UI-SPEC §9 | unit (pure plan) | C101 · C100 | ✅ | ✅ green |
| 06-02-T2 | 06-02 | 2 | DEMO-01, DEMO-05 | T-06-05, T-06-06, T-06-07, T-06-30 | The full plan lands in Mongo and Silo with coherent histories, linked documents and downloadable PDFs | unit | C102 · C100 | ✅ | ✅ green |
| 06-02-T3 | 06-02 | 2 | DEMO-01, DEMO-05 | T-06-05, T-06-06, T-06-07, T-06-30 | --reset wipes everything after saying what it deletes, a typo is rejected, user links are respected, an interrupted run recovers, and the image runs the same command | unit | C103 · C104 · C105 · C106 | ✅ | ✅ green |
| 06-03-T1 | 06-03 | 1 | DEMO-01, DEMO-05 | T-06-08 | The three demo offers live in docs/demo/ofertas and the tooling reads them there | integration | C107 · C100 | ✅ | ✅ green |
| 06-04-T1 | 06-04 | 1 | DEMO-05 | T-06-10, T-06-11, T-06-12, T-06-13 | The API survives slow or absent Mongo and Silo at start, and S3 checks never hang | integration | C108 · C100 | ✅ | ✅ green |
| 06-04-T2 | 06-04 | 1 | DEMO-05 | T-06-10, T-06-11, T-06-12, T-06-13 | A missing built file is a 404, not the app shell, and a missing index.html is loud | integration | C109 · C106 | ✅ | ✅ green |
| 06-05-T1 | 06-05 | 1 | DEMO-05 | T-06-09, T-06-24 | Oversized application bodies are refused with the standard error, and contracts bound the open strings | integration + unit | C110 · C100 | ✅ | ✅ green |
| 06-05-T2 | 06-05 | 1 | DEMO-05 | T-06-09, T-06-24 | A failed smoke cleans up after itself | compose smoke | C111 · C106 | ✅ | ✅ green |
| 06-06-T1 | 06-06 | 2 | DEMO-03, DEMO-04, DEMO-05 | T-06-31, T-06-32 | The shell has a skip link, a visible gold focus ring on the sidebar, 44 px targets and an on-scale wordmark and theme toggle | component | C112 · C100 | ✅ | ✅ green |
| 06-06-T2 | 06-06 | 2 | DEMO-03, DEMO-04, DEMO-05 | T-06-31, T-06-32 | Changing a filter keeps the list on screen until the new answer arrives | component | C113 · C106 | ✅ | ✅ green |
| 06-07-T1 | 06-07 | 3 | DEMO-04, DEMO-03 | T-06-16 | The shared components drop the red icon tint and sit on the scales | component | C114 · C100 | ✅ | ✅ green |
| 06-07-T2 | 06-07 | 3 | DEMO-04, DEMO-03 | T-06-16 | The upload dialog follows the same tokens, and the earlier contracts say so | component | C115 · C106 | ✅ | ✅ green |
| 06-08-T1 | 06-08 | 4 | DEMO-04, DEMO-03 | T-06-33 | Every pod error icon, delete trigger and skeleton card follows the same tokens and spacing | component | C116 · C106 | ✅ | ✅ green |
| 06-09-T1 | 06-09 | 5 | DEMO-04 | T-06-17 | A locked dialog says why it will not close | component | C117 · C106 | ✅ | ✅ green |
| 06-10-T1 | 06-10 | 6 | DEMO-04, DEMO-05 | T-06-18 | Reopening a delete dialog never shows the previous attempt's error | component | C118 · C106 | ✅ | ✅ green |
| 06-11-T1 | 06-11 | 7 | DEMO-03, DEMO-04 | T-06-14, T-06-15, T-06-34 | Unknown routes and route errors show Spanish screens in the design-system voice | component | C119 · C100 | ✅ | ✅ green |
| 06-11-T2 | 06-11 | 7 | DEMO-03, DEMO-04 | T-06-14, T-06-15, T-06-34 | Every view's loading, error and empty states are reviewed by a test, and any gap is fixed | component | C120 · C100 | ✅ | ✅ green |
| 06-11-T3 | 06-11 | 7 | DEMO-03, DEMO-04 | T-06-14, T-06-15, T-06-34 | Every screen of the responsive matrix has a 360 px guard on the UI-SPEC risk points and a width guard at 768 and 1280 px, and any overflow risk found is fixed | component | C121 · C106 | ✅ | ✅ green |
| 06-12-T1 | 06-12 | 8 | DEMO-04 | T-06-19 | axe runs on every screen and state, light and dark, with zero violations | component | C122 · C123 | ✅ | ✅ green |
| 06-12-T2 | 06-12 | 8 | DEMO-04 | T-06-19 | The design tokens are proved AA in light and dark from the CSS itself | component + unit | C124 · C100 | ✅ | ✅ green |
| 06-12-T3 | 06-12 | 8 | DEMO-04 | T-06-19 | Every load, error, AI and upload message is announced by a region that existed before it | component | C125 · C106 | ✅ | ✅ green |
| 06-13-T1 | 06-13 | 9 | DEMO-06 | T-06-20 | The timer tests are deterministic | component | C126 · C100 | ✅ | ✅ green |
| 06-13-T2 | 06-13 | 9 | DEMO-06 | T-06-20 | A cold worker start is retried once, visibly, and real failures still fail | component + unit | C127 · C106 | ✅ | ✅ green |
| 06-14-T1 | 06-14 | 1 | DEMO-06 | T-06-21 | Every web pod mapper has direct unit tests | component + unit + script | C116 · C128 · C100 | ✅ | ✅ green |
| 06-14-T2 | 06-14 | 1 | DEMO-06 | T-06-21 | The API mappers are proved to whitelist fields, including the seed mark | integration + unit | C129 · C106 | ✅ | ✅ green |
| 06-15-T1 | 06-15 | 10 | DEMO-06 | T-06-22 | Every DOMAIN rule points to a passing test | integration + component | C130 · C100 | ✅ | ✅ green |
| 06-15-T2 | 06-15 | 10 | DEMO-06 | T-06-22 | Phase 2's Nyquist validation is closed with evidence | integration + component + unit | C131 · C100 | ✅ | ✅ green |
| 06-15-T3 | 06-15 | 10 | DEMO-06 | T-06-22 | Phase 5's Nyquist validation is closed with evidence, and Phase 3's is confirmed | compose smoke + integration + component | C132 · C106 · C133 | ✅ | ✅ green |
| 06-16-T1 | 06-16 | 9 | DEMO-01, DEMO-02, DEMO-05 | T-06-23, T-06-25, T-06-26, T-06-27 | A cold start of the real image seeds, serves and extracts in an isolated project | compose smoke | C134 · C135 · C100 | ✅ | ✅ green |
| 06-16-T2 | 06-16 | 9 | DEMO-01, DEMO-02, DEMO-05 | T-06-23, T-06-25, T-06-26, T-06-27 | The docs and the requirement text tell the same story as the seed and the moved offers | grep | C136 · C100 | ✅ | ✅ green |
| 06-16-T3 | 06-16 | 9 | DEMO-01, DEMO-02, DEMO-05 | T-06-23, T-06-25, T-06-26, T-06-27 | A stranger can run, seed, switch the model, warm it and recover with mock from the README alone | compose smoke | C137 · C138 · C100 | ✅ | ✅ green |
| 06-17-T1 | 06-17 | 11 | DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06 | T-06-28, T-06-29, T-06-35, T-06-36, T-06-37 | A clean checkout and the full gate pass, and the seeded stack is up for the human pass | compose smoke | C97 · C98 | ✅ | ✅ green |
| 06-17-T2 | 06-17 | 11 | DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06 | T-06-28, T-06-29, T-06-35, T-06-36, T-06-37 | The presenter checks the screens, the keyboard, the motion and the stopwatch, and captures the screenshot | manual (human pass) | C147 | ✅ | ✅ green |
| 06-17-T3 | 06-17 | 11 | DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06 | T-06-28, T-06-29, T-06-35, T-06-36, T-06-37 | Every layout and keyboard issue the presenter found is fixed with a guard, and the pass is recorded with the screenshot | component | C145 · C146 · C147 | ✅ | ✅ green |


---

## Map evidence (06-17)

Each line is a command run by plan 06-17, with its exit status. C01-C48 ran before the human pass. C49-C96 re-ran all of them after the first fixes (98e5c63) and C97-C144 once more after the last one (bd6f63b); the last line of a command wins, so the rows point to C97-C144. C145-C147 are the `<verify>` commands of Task 3.

```text
C01 0 tmp="$(mktemp -d)" && git clone --quiet . "$tmp/expediente" && (cd "$tmp/expediente" && npm ci --no-audit --no-fund && npm run typecheck && npm run test); status=$?; rm -rf "$tmp"; test "$status" -eq 0
C02 0 npm run typecheck && npm run lint && npm run test && npm run build && bash scripts/compose-smoke.sh --down && bash scripts/compose-smoke.sh --cold
C03 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && test -f apps/api/dist/scripts/assets/cv-frontend.pdf && npm run seed && npm run seed
C04 0 npm run typecheck && npm run test
C05 0 npm run test -w @tfm/api -- src/scripts/seed
C06 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed
C07 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed -- --nope 2>&1 | grep -q "Opción desconocida: --nope"
C08 0 npm run seed 2>&1 | grep -q "Ofertas para pegar en la demo: docs/demo/ofertas/"
C09 0 docker compose build app && docker run --rm --entrypoint sh tfm-app:0.1.0 -c 'npm run seed -- --nope > /tmp/seed.out 2>&1; grep -q "Opción desconocida: --nope" /tmp/seed.out'
C10 0 npm run typecheck && npm run test && npm run lint
C11 0 npm run test -w @tfm/api -- src/offers && rm -rf apps/api/dist && npm run build -w @tfm/api && test -f apps/api/dist/main.js && test ! -e apps/api/dist/offers/__fixtures__/fixtures.js && test ! -e apps/api/dist/scripts/try-extract.js
C12 0 npm run test -w @tfm/api -- src/startup.test.ts src/storage
C13 0 npm run test -w @tfm/api -- src/app.test.ts
C14 0 npm run test -w @tfm/contracts -- src/application.schema.test.ts && npm run test -w @tfm/api -- src/applications
C15 0 bash -n scripts/compose-smoke.sh && docker compose version && bash scripts/compose-smoke.sh --down
C16 0 npm run test -w @tfm/web -- src/layouts src/core/theme src/common
C17 0 npm run test -w @tfm/web -- src/pods/application-list src/core/router
C18 0 npm run test -w @tfm/web -- src/common
C19 0 npm run test -w @tfm/web -- src/pods/document-upload
C20 0 npm run test -w @tfm/web -- src/pods
C21 0 npm run test -w @tfm/web -- src/pods/document-upload src/pods/application-detail
C22 0 npm run test -w @tfm/web -- src/pods/application-detail src/pods/document-list
C23 0 npm run test -w @tfm/web -- src/core/router
C24 0 npm run test -w @tfm/web -- src/test/view-states.test.tsx
C25 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx
C26 0 npm run test -w @tfm/web -- src/test src/core/router
C27 0 npm ls axe-core -w @tfm/web && npm run typecheck && npm run test
C28 0 npm run test -w @tfm/web -- src/common/lib/contrast.test.ts
C29 0 npm run test -w @tfm/web -- src/test/live-regions.test.tsx
C30 0 for i in 1 2 3 4 5; do npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail || exit 1; done
C31 0 npm run test -w @tfm/web -- src/common/lib/format.test.ts 2>&1 | grep -qE "Test Files +1 passed" && ! (node apps/web/scripts/run-vitest.mjs src/no-such-file.test.ts 2>&1 | grep -q "retrying once")
C32 0 gaps="$(for f in apps/web/src/pods/*/*.mapper.ts; do t="${f%.ts}.test.ts"; test -f "$t" || echo "missing $t"; for n in $(grep -oE "^export (const|function) [A-Za-z_]+" "$f" | awk '{print $3}'); do grep -q "$n" "$t" "${f%.mapper.ts}.merge.test.ts" 2>/dev/null || echo "untested $n"; done; done | wc -l | tr -d ' ')"; test "$gaps" -eq 0
C33 0 npm run test -w @tfm/api -- src/applications/applications.mapper.test.ts src/documents/documents.mapper.test.ts
C34 0 npm run test -w @tfm/api -- src/applications && npm run test -w @tfm/web -- src/pods/application-edit
C35 0 npm run test -w @tfm/contracts && npm run test -w @tfm/api -- src/applications src/tags && npm run test -w @tfm/web -- src/pods/application-list src/pods/application-detail src/pods/application-edit src/core/router
C36 0 npm run test -w @tfm/api -- src/documents src/storage src/applications && npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail src/pods/application-edit src/core/router src/layouts src/common
C37 0 npm run build && bash scripts/compose-smoke.sh --down
C38 0 bash -n scripts/compose-smoke.sh && bash scripts/compose-smoke.sh --cold
C39 0 test -z "$(docker compose -p expediente-cold ps -a -q)" && docker volume ls --format '{{.Name}}' | grep -q '^expediente_ollama-data$'
C40 0 grep -q "docs/demo/ofertas" docs/AI-EXTRACTION.md && ! grep -q "Se reutilizan en el seed" docs/AI-EXTRACTION.md && grep -q "seed -- --reset" docs/ARCHITECTURE.md && grep -q "No encontramos esta página" docs/DESIGN.md && grep -q "docs/demo/ofertas" .planning/REQUIREMENTS.md && ! grep -q "documents and the 3 fixture offers into Mongo" .planning/REQUIREMENTS.md .planning/ROADMAP.md && grep -q "available to paste from \`docs/demo/ofertas/\`" .planning/ROADMAP.md
C41 0 grep -q "docs/img/application-list.png" README.md && grep -q "Lista de candidaturas de Expediente con el tema claro" README.md && grep -qF "npm run seed -- --reset" README.md && grep -q "docs/demo/ofertas" README.md && grep -q "LLM_MODEL" README.md && grep -qF "LLM_PROVIDER=mock docker compose up" README.md && grep -q "compatible con OpenAI" README.md && grep -q "Calentar el modelo antes de la demo" README.md && grep -qF "compose-smoke.sh --cold" README.md && grep -q "## Arrancar en 3 comandos" README.md && grep -q "v2.24" README.md
C42 0 ! grep -qE "fase [0-9]" README.md && ! grep -qiE "gemini|groq" README.md && ! grep -q "¡" README.md && ! grep -qP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" README.md && grep -q 'OLLAMA_KEEP_ALIVE: "30m"' compose.yml && docker compose config -q
C43 0 npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts
C44 0 npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts
C45 0 bash scripts/compose-smoke.sh --cold
C46 0 grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md
C47 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common
C48 0 npm run test -w @tfm/api -- src/applications src/documents
C49 0 tmp="$(mktemp -d)" && git clone --quiet . "$tmp/expediente" && (cd "$tmp/expediente" && npm ci --no-audit --no-fund && npm run typecheck && npm run test); status=$?; rm -rf "$tmp"; test "$status" -eq 0
C50 0 npm run typecheck && npm run lint && npm run test && npm run build && bash scripts/compose-smoke.sh --down && bash scripts/compose-smoke.sh --cold
C51 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && test -f apps/api/dist/scripts/assets/cv-frontend.pdf && npm run seed && npm run seed
C52 0 npm run typecheck && npm run test
C53 0 npm run test -w @tfm/api -- src/scripts/seed
C54 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed
C55 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed -- --nope 2>&1 | grep -q "Opción desconocida: --nope"
C56 0 npm run seed 2>&1 | grep -q "Ofertas para pegar en la demo: docs/demo/ofertas/"
C57 0 docker compose build app && docker run --rm --entrypoint sh tfm-app:0.1.0 -c 'npm run seed -- --nope > /tmp/seed.out 2>&1; grep -q "Opción desconocida: --nope" /tmp/seed.out'
C58 0 npm run typecheck && npm run test && npm run lint
C59 0 npm run test -w @tfm/api -- src/offers && rm -rf apps/api/dist && npm run build -w @tfm/api && test -f apps/api/dist/main.js && test ! -e apps/api/dist/offers/__fixtures__/fixtures.js && test ! -e apps/api/dist/scripts/try-extract.js
C60 0 npm run test -w @tfm/api -- src/startup.test.ts src/storage
C61 0 npm run test -w @tfm/api -- src/app.test.ts
C62 0 npm run test -w @tfm/contracts -- src/application.schema.test.ts && npm run test -w @tfm/api -- src/applications
C63 0 bash -n scripts/compose-smoke.sh && docker compose version && bash scripts/compose-smoke.sh --down
C64 0 npm run test -w @tfm/web -- src/layouts src/core/theme src/common
C65 0 npm run test -w @tfm/web -- src/pods/application-list src/core/router
C66 0 npm run test -w @tfm/web -- src/common
C67 0 npm run test -w @tfm/web -- src/pods/document-upload
C68 0 npm run test -w @tfm/web -- src/pods
C69 0 npm run test -w @tfm/web -- src/pods/document-upload src/pods/application-detail
C70 0 npm run test -w @tfm/web -- src/pods/application-detail src/pods/document-list
C71 0 npm run test -w @tfm/web -- src/core/router
C72 0 npm run test -w @tfm/web -- src/test/view-states.test.tsx
C73 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx
C74 0 npm run test -w @tfm/web -- src/test src/core/router
C75 0 npm ls axe-core -w @tfm/web && npm run typecheck && npm run test
C76 0 npm run test -w @tfm/web -- src/common/lib/contrast.test.ts
C77 0 npm run test -w @tfm/web -- src/test/live-regions.test.tsx
C78 0 for i in 1 2 3 4 5; do npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail || exit 1; done
C79 0 npm run test -w @tfm/web -- src/common/lib/format.test.ts 2>&1 | grep -qE "Test Files +1 passed" && ! (node apps/web/scripts/run-vitest.mjs src/no-such-file.test.ts 2>&1 | grep -q "retrying once")
C80 0 gaps="$(for f in apps/web/src/pods/*/*.mapper.ts; do t="${f%.ts}.test.ts"; test -f "$t" || echo "missing $t"; for n in $(grep -oE "^export (const|function) [A-Za-z_]+" "$f" | awk '{print $3}'); do grep -q "$n" "$t" "${f%.mapper.ts}.merge.test.ts" 2>/dev/null || echo "untested $n"; done; done | wc -l | tr -d ' ')"; test "$gaps" -eq 0
C81 0 npm run test -w @tfm/api -- src/applications/applications.mapper.test.ts src/documents/documents.mapper.test.ts
C82 0 npm run test -w @tfm/api -- src/applications && npm run test -w @tfm/web -- src/pods/application-edit
C83 0 npm run test -w @tfm/contracts && npm run test -w @tfm/api -- src/applications src/tags && npm run test -w @tfm/web -- src/pods/application-list src/pods/application-detail src/pods/application-edit src/core/router
C84 0 npm run test -w @tfm/api -- src/documents src/storage src/applications && npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail src/pods/application-edit src/core/router src/layouts src/common
C85 0 npm run build && bash scripts/compose-smoke.sh --down
C86 0 bash -n scripts/compose-smoke.sh && bash scripts/compose-smoke.sh --cold
C87 0 test -z "$(docker compose -p expediente-cold ps -a -q)" && docker volume ls --format '{{.Name}}' | grep -q '^expediente_ollama-data$'
C88 0 grep -q "docs/demo/ofertas" docs/AI-EXTRACTION.md && ! grep -q "Se reutilizan en el seed" docs/AI-EXTRACTION.md && grep -q "seed -- --reset" docs/ARCHITECTURE.md && grep -q "No encontramos esta página" docs/DESIGN.md && grep -q "docs/demo/ofertas" .planning/REQUIREMENTS.md && ! grep -q "documents and the 3 fixture offers into Mongo" .planning/REQUIREMENTS.md .planning/ROADMAP.md && grep -q "available to paste from \`docs/demo/ofertas/\`" .planning/ROADMAP.md
C89 0 grep -q "docs/img/application-list.png" README.md && grep -q "Lista de candidaturas de Expediente con el tema claro" README.md && grep -qF "npm run seed -- --reset" README.md && grep -q "docs/demo/ofertas" README.md && grep -q "LLM_MODEL" README.md && grep -qF "LLM_PROVIDER=mock docker compose up" README.md && grep -q "compatible con OpenAI" README.md && grep -q "Calentar el modelo antes de la demo" README.md && grep -qF "compose-smoke.sh --cold" README.md && grep -q "## Arrancar en 3 comandos" README.md && grep -q "v2.24" README.md
C90 0 ! grep -qE "fase [0-9]" README.md && ! grep -qiE "gemini|groq" README.md && ! grep -q "¡" README.md && ! grep -qP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" README.md && grep -q 'OLLAMA_KEEP_ALIVE: "30m"' compose.yml && docker compose config -q
C91 0 npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts
C92 0 npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts
C93 0 bash scripts/compose-smoke.sh --cold
C94 0 grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md
C95 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common
C96 0 npm run test -w @tfm/api -- src/applications src/documents
C97 0 tmp="$(mktemp -d)" && git clone --quiet . "$tmp/expediente" && (cd "$tmp/expediente" && npm ci --no-audit --no-fund && npm run typecheck && npm run test); status=$?; rm -rf "$tmp"; test "$status" -eq 0
C98 0 npm run typecheck && npm run lint && npm run test && npm run build && bash scripts/compose-smoke.sh --down && bash scripts/compose-smoke.sh --cold
C99 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && test -f apps/api/dist/scripts/assets/cv-frontend.pdf && npm run seed && npm run seed
C100 0 npm run typecheck && npm run test
C101 0 npm run test -w @tfm/api -- src/scripts/seed
C102 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed
C103 0 npm run test -w @tfm/api -- src/scripts/seed && npm run build -w @tfm/contracts && npm run build -w @tfm/api && npm run seed -- --nope 2>&1 | grep -q "Opción desconocida: --nope"
C104 0 npm run seed 2>&1 | grep -q "Ofertas para pegar en la demo: docs/demo/ofertas/"
C105 0 docker compose build app && docker run --rm --entrypoint sh tfm-app:0.1.0 -c 'npm run seed -- --nope > /tmp/seed.out 2>&1; grep -q "Opción desconocida: --nope" /tmp/seed.out'
C106 0 npm run typecheck && npm run test && npm run lint
C107 0 npm run test -w @tfm/api -- src/offers && rm -rf apps/api/dist && npm run build -w @tfm/api && test -f apps/api/dist/main.js && test ! -e apps/api/dist/offers/__fixtures__/fixtures.js && test ! -e apps/api/dist/scripts/try-extract.js
C108 0 npm run test -w @tfm/api -- src/startup.test.ts src/storage
C109 0 npm run test -w @tfm/api -- src/app.test.ts
C110 0 npm run test -w @tfm/contracts -- src/application.schema.test.ts && npm run test -w @tfm/api -- src/applications
C111 0 bash -n scripts/compose-smoke.sh && docker compose version && bash scripts/compose-smoke.sh --down
C112 0 npm run test -w @tfm/web -- src/layouts src/core/theme src/common
C113 0 npm run test -w @tfm/web -- src/pods/application-list src/core/router
C114 0 npm run test -w @tfm/web -- src/common
C115 0 npm run test -w @tfm/web -- src/pods/document-upload
C116 0 npm run test -w @tfm/web -- src/pods
C117 0 npm run test -w @tfm/web -- src/pods/document-upload src/pods/application-detail
C118 0 npm run test -w @tfm/web -- src/pods/application-detail src/pods/document-list
C119 0 npm run test -w @tfm/web -- src/core/router
C120 0 npm run test -w @tfm/web -- src/test/view-states.test.tsx
C121 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx
C122 0 npm run test -w @tfm/web -- src/test src/core/router
C123 0 npm ls axe-core -w @tfm/web && npm run typecheck && npm run test
C124 0 npm run test -w @tfm/web -- src/common/lib/contrast.test.ts
C125 0 npm run test -w @tfm/web -- src/test/live-regions.test.tsx
C126 0 for i in 1 2 3 4 5; do npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail || exit 1; done
C127 0 npm run test -w @tfm/web -- src/common/lib/format.test.ts 2>&1 | grep -qE "Test Files +1 passed" && ! (node apps/web/scripts/run-vitest.mjs src/no-such-file.test.ts 2>&1 | grep -q "retrying once")
C128 0 gaps="$(for f in apps/web/src/pods/*/*.mapper.ts; do t="${f%.ts}.test.ts"; test -f "$t" || echo "missing $t"; for n in $(grep -oE "^export (const|function) [A-Za-z_]+" "$f" | awk '{print $3}'); do grep -q "$n" "$t" "${f%.mapper.ts}.merge.test.ts" 2>/dev/null || echo "untested $n"; done; done | wc -l | tr -d ' ')"; test "$gaps" -eq 0
C129 0 npm run test -w @tfm/api -- src/applications/applications.mapper.test.ts src/documents/documents.mapper.test.ts
C130 0 npm run test -w @tfm/api -- src/applications && npm run test -w @tfm/web -- src/pods/application-edit
C131 0 npm run test -w @tfm/contracts && npm run test -w @tfm/api -- src/applications src/tags && npm run test -w @tfm/web -- src/pods/application-list src/pods/application-detail src/pods/application-edit src/core/router
C132 0 npm run test -w @tfm/api -- src/documents src/storage src/applications && npm run test -w @tfm/web -- src/pods/document-upload src/pods/document-list src/pods/application-detail src/pods/application-edit src/core/router src/layouts src/common
C133 0 npm run build && bash scripts/compose-smoke.sh --down
C134 0 bash -n scripts/compose-smoke.sh && bash scripts/compose-smoke.sh --cold
C135 0 test -z "$(docker compose -p expediente-cold ps -a -q)" && docker volume ls --format '{{.Name}}' | grep -q '^expediente_ollama-data$'
C136 0 grep -q "docs/demo/ofertas" docs/AI-EXTRACTION.md && ! grep -q "Se reutilizan en el seed" docs/AI-EXTRACTION.md && grep -q "seed -- --reset" docs/ARCHITECTURE.md && grep -q "No encontramos esta página" docs/DESIGN.md && grep -q "docs/demo/ofertas" .planning/REQUIREMENTS.md && ! grep -q "documents and the 3 fixture offers into Mongo" .planning/REQUIREMENTS.md .planning/ROADMAP.md && grep -q "available to paste from \`docs/demo/ofertas/\`" .planning/ROADMAP.md
C137 0 grep -q "docs/img/application-list.png" README.md && grep -q "Lista de candidaturas de Expediente con el tema claro" README.md && grep -qF "npm run seed -- --reset" README.md && grep -q "docs/demo/ofertas" README.md && grep -q "LLM_MODEL" README.md && grep -qF "LLM_PROVIDER=mock docker compose up" README.md && grep -q "compatible con OpenAI" README.md && grep -q "Calentar el modelo antes de la demo" README.md && grep -qF "compose-smoke.sh --cold" README.md && grep -q "## Arrancar en 3 comandos" README.md && grep -q "v2.24" README.md
C138 0 ! grep -qE "fase [0-9]" README.md && ! grep -qiE "gemini|groq" README.md && ! grep -q "¡" README.md && ! grep -qP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" README.md && grep -q 'OLLAMA_KEEP_ALIVE: "30m"' compose.yml && docker compose config -q
C139 0 npm run test -w @tfm/api -- src/scripts/seed/seed.plan.test.ts
C140 0 npm run test -w @tfm/api -- src/scripts/seed/seed.run.test.ts
C141 0 bash scripts/compose-smoke.sh --cold
C142 0 grep -q "LLM_PROVIDER=mock" README.md && ! grep -q "fase 1" README.md
C143 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx src/layouts src/common
C144 0 npm run test -w @tfm/api -- src/applications src/documents
C145 0 npm run test -w @tfm/web -- src/test/responsive.test.tsx && npm run typecheck && npm run test
C146 0 test -f docs/img/application-list.png && node -e 'const b=require("node:fs").readFileSync("docs/img/application-list.png");const ok=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.length<307200&&b.readUInt32BE(16)===1280&&b.readUInt32BE(20)===800;process.exit(ok?0:1)'
C147 0 node -e 'const t=require("node:fs").readFileSync(".planning/phases/06-pulido-de-demo/06-UAT.md","utf8"),R=t.split("\n").map(l=>l.split("|").map(c=>c.trim())),bad=[];const row=(a,b)=>R.find(c=>c[1]===a&&c[2]===b);const done=(c,s,k)=>c[5]==="pass"||(/^fixed [0-9a-f]{7,40}$/.test(c[5])&&t.includes("Re-check "+s+" · "+k));for(const s of ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S11"]){for(const w of ["360","768","1280"]){const c=row(s,w),m=c?[c[3],c[4]].map(x=>/^(\d+)\/(\d+)$/.exec(x)):[];if(!c||!m[0]||!m[1]||!done(c,s,w)||(c[5]==="pass"&&m.some(x=>+x[1]>+x[2])))bad.push(s+" "+w)}const f=row(s,"focus");if(!f||![f[3],f[4]].every(x=>x==="visible"||x==="not visible")||!done(f,s,"focus")||(f[5]==="pass"&&(f[3]!=="visible"||f[4]!=="visible")))bad.push(s+" focus")}const secs=[...t.matchAll(/^seconds: (\d+)$/gm)].map(x=>+x[1]);if(secs.length!==2)bad.push("seconds");for(const n of secs)if(n>=120)bad.push("timed run "+n+" s, not under 120 s");if(!t.includes("S10"))bad.push("S10 note");if(!/^status: (testing|complete|issues)$/m.test(t))bad.push("status");if(/^status: complete$/m.test(t)&&t.includes("result: [pending]"))bad.push("complete with pending");if(bad.length){console.error("UAT GATE FAIL: "+bad.join(", "));process.exit(1)}console.log("UAT GATE OK")'
```

---
## Wave 0 Requirements

- [x] `apps/api/src/scripts/seed/seed.plan.test.ts`, `seed.run.test.ts` — DEMO-01 (D-10)
- [x] `apps/web/src/test/axe.ts` + axe tests; `axe-core` devDependency — DEMO-04 (D-13)
- [x] `apps/web/src/common/lib/contrast.ts` + `contrast.test.ts` — DEMO-04
- [x] Mapper unit tests (web pods + api mappers) — DEMO-06 (D-23)
- [x] `--cold` mode in `scripts/compose-smoke.sh` — DEMO-01/05 (D-15)
- [x] `apps/web/src/test/view-states.test.tsx` and `apps/web/src/test/responsive.test.tsx` — DEMO-03/04 (D-11, D-12)

---

## DOMAIN rule coverage (D-23)

Each rule of `docs/DOMAIN.md` «Reglas de negocio» traced to the test that proves it. Every test below passed in plan 06-15 (`npm run test -w @tfm/api -- src/applications src/documents` and `npm run test -w @tfm/web -- src/pods/application-edit src/pods/application-detail`). Titles marked «(rule N)» were added or already carried the rule in plan 06-15 or earlier.

| Rule | Clause | Test file | Test title | Command |
|------|--------|-----------|------------|---------|
| 1 | Any status moves to any other, each move adds one history entry | `apps/api/src/applications/applications.status.test.ts` | allows a move between any two of the seven statuses and records each in the history (rule 1) | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | A move appends `{ status, at }` and sets `updatedAt` to that instant | `apps/api/src/applications/applications.status.test.ts` | answers 200 with the new status, one new history entry and updatedAt equal to its instant | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | Unchanged status adds no history entry | `apps/api/src/applications/applications.status.test.ts` | is idempotent for the current status: 200, same document, no history entry, updatedAt kept | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 1 | Concurrent moves to the same status add one entry only | `apps/api/src/applications/applications.status.test.ts` | writes exactly one extra history entry for three concurrent moves to enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | First `enviada` sets `appliedAt` to the history instant | `apps/api/src/applications/applications.status.test.ts` | sets appliedAt to the instant of the history entry on the move to enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | Other statuses leave `appliedAt` empty | `apps/api/src/applications/applications.status.test.ts` | does not fill appliedAt on a move to any other status | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | Only the first `enviada` counts | `apps/api/src/applications/applications.status.test.ts` | keeps the first appliedAt through guardada -> enviada -> guardada -> enviada | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 2 | A value the user set is never overwritten | `apps/api/src/applications/applications.status.test.ts` | never overwrites an appliedAt the user set | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 3 | A round while `enviada` moves to `en_entrevistas` with a history entry | `apps/api/src/applications/applications.interviews.test.ts` | creates round 1, moves an enviada application to en_entrevistas and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 3 | From any other status the status and history stay | `apps/api/src/applications/applications.interviews.test.ts` | rule 3 only fires from enviada > keeps status and history when the status is %s | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 3 | A second round while `en_entrevistas` adds no history entry | `apps/api/src/applications/applications.interviews.test.ts` | adds no history entry for a second round while en_entrevistas and numbers it 2 | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 4 | A linked document cannot be deleted (409 `DOCUMENT_IN_USE`, Spanish message) | `apps/api/src/documents/documents.test.ts` | answers 409 DOCUMENT_IN_USE and keeps everything when %s links it | `npm run test -w @tfm/api -- src/documents/documents.test.ts` |
| 4 | Deletable again once the link is cleared | `apps/api/src/applications/applications.documents.test.ts` | makes a linked document undeletable until the link is cleared (rule 4) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Wrong-type link on create is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a cover letter as CV and a CV as cover letter, writing nothing | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Wrong-type link on edit is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a wrong-type link with 400 and leaves every stored field unchanged | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Non-existent link on create is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | reports a malformed and an unknown id together as nonexistent | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 4 | Non-existent link on edit is rejected with the field error | `apps/api/src/applications/applications.documents.test.ts` | rejects a link to a document that does not exist with the error in the field and keeps the stored fields (rule 4) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 5 | Deleting an application asks for confirmation | `apps/web/src/pods/application-detail/application-detail.test.tsx` | delete dialog > opens with the title, the description with title and company, and focus on «Conservar candidatura» | `npm run test -w @tfm/web -- src/pods/application-detail/application-detail.test.tsx` |
| 5 | Its documents stay in the library, unlinked and deletable | `apps/api/src/applications/applications.documents.test.ts` | keeps the documents of a deleted application, now deletable (rule 5) | `npm run test -w @tfm/api -- src/applications/applications.documents.test.ts` |
| 5 | The documents collection is untouched by the delete | `apps/api/src/applications/applications.delete.test.ts` | leaves the documents collection untouched | `npm run test -w @tfm/api -- src/applications/applications.delete.test.ts` |
| 6 | The draft fills only empty fields and keeps what the user typed | `apps/web/src/pods/application-edit/application-edit.merge.test.ts` | mergeExtractionIntoForm: the six-field rule > keeps the values the user typed | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts` |
| 6 | Tags merge without duplicates | `apps/web/src/pods/application-edit/application-edit.merge.test.ts` | mergeExtractionIntoForm: tags > adds the proposed tags after the existing ones, in model order, without duplicates | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.merge.test.ts` |
| 6 | Nothing is persisted until the user saves | `apps/web/src/pods/application-edit/application-edit.ai.test.tsx` | saves the merged values only when the user presses «Guardar candidatura» | `npm run test -w @tfm/web -- src/pods/application-edit/application-edit.ai.test.tsx` |
| 7 | `updatedAt` changes on a status change | `apps/api/src/applications/applications.status.test.ts` | answers 200 with the new status, one new history entry and updatedAt equal to its instant | `npm run test -w @tfm/api -- src/applications/applications.status.test.ts` |
| 7 | `updatedAt` changes when a round is added | `apps/api/src/applications/applications.interviews.test.ts` | creates round 1, moves an enviada application to en_entrevistas and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when a round is edited | `apps/api/src/applications/applications.interviews.test.ts` | replaces the fields of one round, keeps its id and the other rounds, and sets updatedAt | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when a round is deleted | `apps/api/src/applications/applications.interviews.test.ts` | pulls one round, keeps the other numbers, answers 200 with the application and the next round is 4 | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` |
| 7 | `updatedAt` changes when the fields are edited | `apps/api/src/applications/applications.update.test.ts` | updates the editable fields, normalizes tags and keeps status, history, interviews, createdAt and ownerId | `npm run test -w @tfm/api -- src/applications/applications.update.test.ts` |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No horizontal scroll at 360/768/1280, both themes | DEMO-03 | No browser in the devcontainer; jsdom has no layout | Walk screens S1-S11 at each viewport, record in UAT; every reported overflow is fixed with a guard in 06-17 Task 3 |
| Full keyboard walkthrough, visible focus, reduced motion | DEMO-04 | Real focus rendering needs a browser | Tab through the demo flow, record in UAT |
| Demo flow under 2 minutes with Ollama and with mock | DEMO-05 | Timed human run | Run the flow twice with a timer, record times in UAT |
| README screenshot | DEMO-02 | Needs a browser capture | Capture seeded list, light theme, store as `docs/img/application-list.png` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
