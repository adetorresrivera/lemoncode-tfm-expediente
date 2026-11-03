---
phase: 01-fundaciones-y-walking-skeleton
plan: 04
subsystem: ui
tags: [react, tanstack-router, tailwind, vitest, testing-library, zod, intl]

requires:
  - phase: 01-fundaciones-y-walking-skeleton
    provides: "Plan 01-01 workspace, web scaffold and contracts error/health schemas; plan 01-02 quality gate and DS stylesheet ignore rules; plan 01-03 applicationSchema and Application type"
provides:
  - "Web Vitest + Testing Library harness (jsdom, matchMedia/scrollTo stubs)"
  - "TanStack Router with committed routeTree.gen.ts; / redirects (replace) to /applications"
  - "ApplicationListScene composing header + application-list pod (routes -> scenes -> pods)"
  - "application-list pod with the full CLAUDE.md file set and a pod-owned view model"
  - "Expediente DS stylesheet (byte copy), Tailwind plugin and three variable font families in the bundle"
  - "Typed http-client (request, HttpError) with contract-parsed errors"
  - "es-ES formatDate / formatMoney"
  - "Empty pod barrels for application-detail, application-edit, document-upload"
affects: [01-05 app layout and theme, phase-02 applications CRUD and list, phase-03 AI panel, phase-05 documents]

actuals:
  tokens: 9000
  tasks: 3
  commits: 3
plan_head_before: f8d1727aa24145ae53c42e3399090222b12aa1f5
plan_head_after: 36e65d1cd8b27325e54b5b044a0bef2f9eebd831

tech-stack:
  added: []
  patterns:
    - "Pod file set: api/api.ts, vm, mapper, hooks, container, component, components/, index.ts exporting only the container"
    - "View model written field by field, no import of the API model; mapper is the single API-to-VM conversion point, applied in the hook"
    - "createAppRouter(history?) factory plus singleton and Register typing; tests use createMemoryHistory"
    - "request(path, contractsSchema, options): every success and error body is validated by a contracts schema"

key-files:
  created:
    - apps/web/vitest.config.ts
    - apps/web/src/test/setup.ts
    - apps/web/src/app.tsx
    - apps/web/src/core/router/router.ts
    - apps/web/src/core/router/router.test.tsx
    - apps/web/src/core/http/http-client.ts
    - apps/web/src/core/http/http-client.test.ts
    - apps/web/src/routes/__root.tsx
    - apps/web/src/routes/index.tsx
    - apps/web/src/routes/applications/index.tsx
    - apps/web/src/routeTree.gen.ts
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/pods/application-list/ (api/api.ts, vm, mapper, hooks, container, component, components/empty-state.tsx, index.ts, test)
    - apps/web/src/pods/application-detail/index.ts
    - apps/web/src/pods/application-edit/index.ts
    - apps/web/src/pods/document-upload/index.ts
    - apps/web/src/common/lib/format.ts
    - apps/web/src/common/lib/format.test.ts
    - apps/web/src/styles.css
  modified:
    - apps/web/package.json
    - apps/web/vite.config.ts
    - apps/web/src/main.tsx

key-decisions:
  - "No dependency added (only the test script in apps/web/package.json); package-lock.json untouched"
  - "useApplicationList issues no request in Phase 1: GET /api/applications is APP-04 (Phase 2) and the API would 404, hiding the D-18 empty state; getApplications exists and is typed but unwired"
  - "Client-side error codes NETWORK_ERROR and INVALID_RESPONSE live in the http-client as HttpErrorCode, not in contracts (they are not API models)"
  - "formatMoney uses useGrouping: always so 5200 prints 5.200 (OQ5)"

patterns-established:
  - "Mapper naming: mapXFromApiToVm / mapXListFromApiToVm"
  - "AbortError is detected by name (duck-typed) so it works across the jsdom/Node DOMException realms"

requirements-completed: [FND-05, FND-07, FND-02]

coverage:
  - id: D1
    description: "Opening / redirects (replace) to /applications, showing the eyebrow, h1 'Mis candidaturas' and the documented empty state through route, scene and pod"
    requirement: FND-05
    verification:
      - kind: unit
        ref: "apps/web/src/core/router/router.test.tsx#redirects / to /applications and shows the empty list"
        status: pass
    human_judgment: false
  - id: D2
    description: "application-list pod has the full CLAUDE.md file set, a pod-owned view model, a mapper applied in the hook, a presentation-only component and a container-only barrel"
    requirement: FND-05
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx"
        status: pass
      - kind: other
        ref: "Task 1 acceptance_criteria greps (file set, vm has no import/extends, hook uses mapper, component has no useState, barrel exports only the container)"
        status: pass
    human_judgment: false
  - id: D3
    description: "styles.css is byte-identical to docs/design/expediente.css and the production CSS carries EB Garamond, Source Sans 3 and JetBrains Mono variable families; no hex or palette classes in TSX"
    requirement: FND-07
    verification:
      - kind: other
        ref: "cmp docs/design/expediente.css apps/web/src/styles.css && grep font families in apps/web/dist/assets/*.css && no-hex grep over apps/web/src --include=*.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rendered look of /applications with the parchment/Oxford tokens and fonts in a real browser"
    requirement: FND-07
    verification: []
    human_judgment: true
    rationale: "Visual fidelity to the DS cannot be asserted by jsdom tests (CSS is disabled in Vitest); the bundle contents were checked but not the rendered page"
  - id: D5
    description: "Typed http-client: contract-validated success, contract error mapping, NETWORK_ERROR, INVALID_RESPONSE, AbortError rethrown, 204 handling, JSON body"
    requirement: FND-02
    verification:
      - kind: unit
        ref: "apps/web/src/core/http/http-client.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "es-ES formatters: formatDate 12 oct. 2026 and formatMoney 52.000 EUR / 5.200 EUR with U+00A0"
    verification:
      - kind: unit
        ref: "apps/web/src/common/lib/format.test.ts"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-29
status: complete
---

# Phase 1 Plan 04: Web Layer Summary

**Routed, DS-styled /applications landing (route to scene to pod) with the course pod file set, a contracts-validated http-client and es-ES formatters, backed by a Vitest + Testing Library harness and a committed route tree.**

## Performance

- **Duration:** 15 min (wall time, excluding the initial `npm ci`)
- **Started:** 2026-10-29T14:00:00Z (approx.)
- **Completed:** 2026-10-29T14:15:00Z
- **Tasks:** 3
- **Files modified:** 30 (per `git diff --shortstat`: 871 insertions, 3 deletions)

## Accomplishments

- `/` throws `redirect({ to: "/applications", replace: true })`; `/applications` renders the scene header (eyebrow, `h1`) and the documented empty state via `ApplicationListScene` and the `ApplicationListContainer` barrel. `routeTree.gen.ts` is generated by the router plugin and committed so typecheck, lint and tests work on a fresh clone.
- `application-list` pod ships the full CLAUDE.md set. `ApplicationListItem` is declared field by field with no imports; the mapper (type-only import of `Application`) is applied in the hook; the container reads the hook; the component only receives props.
- `styles.css` copied byte for byte (`cmp` passes after the pre-commit hooks), Tailwind plugin added after `react()`, all three variable font families present in the production CSS bundle, and no hex or palette class in any TSX.
- `request()` validates every success body and every error body with contracts schemas; raw bodies never reach the UI.
- `formatDate` and `formatMoney` produce `12 oct. 2026`, `5 sept. 2026`, `52.000 €`, `5.200 €` (U+00A0 before the euro sign).

## Task Commits

1. **Task 1: Land on /applications through route, scene and pod, with the web test harness** - `ef46cee` (feat)
2. **Task 2: Ship the Expediente design system and the remaining pod folders** - `664c6ea` (feat)
3. **Task 3: Typed http-client, the pod's typed list request and es-ES formatters** - `36e65d1` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

See `key-files` in the frontmatter. No dependency was added: `apps/web/package.json` gained only the `"test": "vitest run"` script and `package-lock.json` is untouched.

## Decisions Made

See `key-decisions` in the frontmatter. In short: the hook intentionally makes no request in Phase 1; HttpError carries two client-only codes outside contracts; money grouping is forced to always.

## Deviations from Plan

### Process

**1. [Rule 3 - Blocking] TDD RED and GREEN committed together per task**
- **Found during:** Tasks 1 and 3 (both `tdd="true"`)
- **Issue:** The Husky pre-commit runs `npm run typecheck`, so a test-only RED commit that imports modules that do not exist yet cannot be committed without `--no-verify`, which is prohibited. Same constraint hit by plan 01-03.
- **Fix:** Tests were written before the implementation within each task. For Task 3 a pre-implementation run was observed: `http-client.test.ts` and `format.test.ts` failed with "Failed to resolve import" (module missing, which is an import failure and not an assertion-level RED in the #3770 sense; no `tdd-red-evidence` record was produced). Tests and implementation were then committed together as one `feat` commit per task. No `test(...)` commits exist for this plan.
- **Files modified:** none beyond the plan's list.
- **Committed in:** ef46cee, 36e65d1

**2. [Rule 1 - Bug] Reordered a helper in http-client.ts before use**
- **Found during:** Task 3 (review before commit)
- **Issue:** `readJsonOrUndefined` was declared after `request()` that uses it; harmless at runtime but fragile.
- **Fix:** Moved the helper above `request()`.
- **Files modified:** apps/web/src/core/http/http-client.ts
- **Committed in:** 36e65d1

---

**Total deviations:** 2 (1 blocking-process, 1 minor self-correction before commit)
**Impact on plan:** None on scope or behavior; the TDD gate sequence is not satisfied for Tasks 1 and 3 and is recorded here honestly.

## TDD Gate Compliance

Plan type is `execute` with `tdd="true"` tasks, not a `type: tdd` plan. RED and GREEN gate commits are missing for Tasks 1 and 3 because of the pre-commit typecheck described above. The pre-implementation failing run was observed for Task 3 only (import resolution failure), not persisted as evidence.

## Known Stubs

- `apps/web/src/pods/application-list/application-list.hooks.ts` (`useApplicationList`): the list state is initialised from an empty `Application[]` and no request is made. Intentional per the plan: `GET /api/applications` is APP-04 (Phase 2) and the API returns 404 for it until then, which would hide the D-18 empty state. Phase 2 adds the `getApplications` call with an AbortController inside this hook.
- `apps/web/src/pods/application-list/api/api.ts` (`getApplications`): real and typed but not yet called, for the same reason.

The `gsd_run windows append` ledger was not available as a shell command in this worktree, so the two stubs above were not appended to `.planning/WINDOWS.md` (best-effort per executor rules); the orchestrator may add them.

## Issues Encountered

None. The `npm ci` in the fresh worktree took several minutes; lint, typecheck, tests, format check and build then passed first time apart from two Prettier reflows applied before committing.

## Verification Results

- `npm run typecheck && npm run test && npm run lint && npm run format:check && npm run build` exit 0 (contracts 40 tests, api 34 tests, web 23 tests in 4 files).
- `cmp docs/design/expediente.css apps/web/src/styles.css` exits 0 (also re-checked after the commits).
- Font families `EB Garamond Variable`, `Source Sans 3 Variable`, `JetBrains Mono Variable` found in `apps/web/dist/assets/*.css`.
- No-hex / no-palette grep over `apps/web/src --include=*.tsx` returns nothing.
- All Task 1 and Task 3 acceptance-criteria greps pass; `git ls-files --error-unmatch apps/web/src/routeTree.gen.ts` exits 0.

## Threat Surface

No new threat surface beyond the plan's threat model. T-01-17 and T-01-18 mitigated in `http-client.ts` (contract-validated success and error bodies; raw bodies and HTML 500 pages never surfaced, covered by a test asserting the message does not contain the body). No `dangerouslySetInnerHTML`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-05 can replace `Outlet` in `routes/__root.tsx` with `AppLayout` and add `core/theme`; `createAppRouter` and the test setup (matchMedia stub, `dark` class reset) are ready for it.
- Phase 2 plugs data into the existing chain: add the request inside `useApplicationList` using `getApplications` and the existing mapper, and add `validateSearch` with `applicationQuerySchema` on `/applications`.
- Not covered here by design: «Añadir candidatura» button and the counter (Phase 2).

---
*Phase: 01-fundaciones-y-walking-skeleton*
*Completed: 2026-10-29*

## Self-Check: PASSED

- Files exist: all key-files created above (checked via the acceptance greps, build, and test run).
- Commits exist: ef46cee, 664c6ea, 36e65d1 (ancestors of HEAD, measured count 3 from plan_head_before).
