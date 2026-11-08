---
phase: 06-pulido-de-demo
plan: 12
subsystem: testing
tags: [axe-core, a11y, wcag-contrast, aria-live, vitest, jsdom]

requires:
  - phase: 06-pulido-de-demo
    provides: "06-09 close-blocked sentences, 06-10 shell and screens, 06-11 view-state and responsive fixtures"
provides:
  - "checkA11y() axe helper and a zero-violation axe suite over 11 screens/states in light and dark, plus the route-error screen"
  - "contrast.ts (parseThemeTokens, relativeLuminance, contrastRatio) and a test that recomputes the UI-SPEC contrast contract from styles.css"
  - "live-region inventory test that proves each message lands in a region mounted before the text"
affects: [06-17 manual pass, ship gate]

actuals:
  tokens: 11500
  tasks: 3
  commits: 4

plan_head_before: 2ab9c1f197a5c7adb69ba9c8456b03f360b8f2d0
plan_head_after: 2f89217f72679d23f5a6d89e03ffe2cc21bbbead
commits: 4

tech-stack:
  added: ["axe-core 4.14.0 (devDependency of @tfm/web only, exact pin)"]
  patterns:
    - "MutationObserver armed before the trigger separates a pre-existing live region from one created together with its text"
    - "Vitest css option processes only the styles.css?raw import, so a token change fails the build"

key-files:
  created:
    - apps/web/src/test/axe.ts
    - apps/web/src/test/a11y.test.tsx
    - apps/web/src/test/live-regions.test.tsx
    - apps/web/src/common/lib/contrast.ts
    - apps/web/src/common/lib/contrast.test.ts
  modified:
    - apps/web/package.json
    - package-lock.json
    - apps/web/vitest.config.ts
    - apps/web/src/core/router/route-error.test.tsx

key-decisions:
  - "axe-core directly, not vitest-axe: one devDependency, maintained rule set"
  - "color-contrast disabled in axe (jsdom has no layout); AA is proved from the CSS tokens in contrast.test.ts"
  - "The skip link keeps focus:ring-ring; the no-ring-ring check applies to the sidebar surfaces (app-layout.tsx and theme-toggle.tsx) with that one documented class removed before matching"

patterns-established:
  - "Live-region assertions: arm watchAdditions(matcher), run the trigger, then check the message's closest live ancestor was not inserted with it"

requirements-completed: [DEMO-04]

coverage:
  - id: D1
    description: "axe-core reports zero violations (all rules but color-contrast) on the populated and empty list, list load error, detail, detail not-found, create form with AI panel, /documents populated and empty, round dialog, mobile Sheet and not-found screen, in light and dark"
    requirement: DEMO-04
    verification:
      - kind: automated_ui
        ref: "apps/web/src/test/a11y.test.tsx (22 tests plus helper self-test)"
        status: pass
    human_judgment: false
  - id: D2
    description: "axe-core reports zero violations on the route-error screen in light and dark"
    requirement: DEMO-04
    verification:
      - kind: automated_ui
        ref: "apps/web/src/core/router/route-error.test.tsx#has no axe violations"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every text and non-text pair of the UI-SPEC contrast contract is at least 4.5:1 / 3:1 in both themes; documented non-passes stay below threshold and are not used as foreground"
    requirement: DEMO-04
    verification:
      - kind: unit
        ref: "apps/web/src/common/lib/contrast.test.ts (74 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every UI-SPEC section 7 message is announced by a live region (status, polite or alert) that existed before the text"
    requirement: DEMO-04
    verification:
      - kind: integration
        ref: "apps/web/src/test/live-regions.test.tsx (18 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real focus rendering and contrast as painted by a browser"
    requirement: DEMO-04
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout or paint; stays in the 06-17 manual pass"

duration: 25min
completed: 2026-11-06
status: complete
---

# Phase 6 Plan 12: Accessibility evidence as tests Summary

**axe-core 4.14.0 over every screen in both themes, AA contrast recomputed from styles.css, and a MutationObserver-based live-region inventory, all failing the build instead of the defense**

## Performance

- **Duration:** about 25 min
- **Started:** 2026-11-06T20:28Z
- **Completed:** 2026-11-06T20:42Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- `checkA11y()` runs axe with every rule except `color-contrast`; `a11y.test.tsx` covers 11 screens and states x 2 themes (22 tests) and the route-error screen x 2 themes sits in `route-error.test.tsx`. All report zero violations. A self-test proves the helper does flag an `<img>` without alt, so a clean run is not vacuous.
- `contrast.ts` plus `contrast.test.ts` (74 tests) read `styles.css` through `?raw`, check every UI-SPEC text pair at 4.5 and non-text pair at 3.0 in light and dark, pin `foreground` on `background` to 13.94 / 14.57 and `primary-foreground` on `primary` to 10.19 / 10.08, assert the four documented non-passes stay below threshold, and scan app sources (outside `/ui/` and tests) for `text-brand-gold`, `text-destructive` and `ring-ring` on the sidebar surfaces. Every pair already passed; no token needed changing.
- `live-regions.test.tsx` (18 tests) covers: «Candidatura eliminada.», «Documento eliminado.», the result counter, the four loading lines (role=status), the four block-level load errors (role=alert), «Analizando la oferta…» then the AI result in the same region, an AI failure, «Subiendo el archivo…», «Cancela la subida para cerrar.», «Documento subido.» and «Espera a que termine para cerrar.». A watcher test shows it distinguishes a region created with its text from one that already existed.

## TDD Gate Compliance

Task 2 (`tdd="true"`):

- **RED** `919f4d0` `test(06-12)`: `contrast.test.ts` plus the vitest `css.include` change and a compiling stub of `contrast.ts`. 68 of 74 tests failed on their assertions (NaN ratios, empty token maps); the 6 that passed were the `?raw` import guard, the source scans and the documented-non-pass checks that hold independent of the helper. Semantic assessment: the target tests executed and failed on the planned assertions (no import, syntax or fixture fault; the `--background` guard passed, confirming the raw import works). `gsd_run check tdd-red-evidence` was not run (no resolver in this worktree); the vitest output was inspected directly.
- **GREEN** `6307aef` `feat(06-12)`: implementation, 74 of 74 pass.
- **REFACTOR**: none needed.

Task 1 and Task 3 are `type="auto"` without `tdd`, so single `test(06-12)` commits.

## Task Commits

1. **Task 1: axe on every screen and state, light and dark** - `5418023` (test)
2. **Task 2: design tokens proved AA from the CSS** - `919f4d0` (test, RED), `6307aef` (feat, GREEN)
3. **Task 3: live-region inventory** - `2f89217` (test)

**Plan metadata:** committed as `docs(06-12)` after this file.

## Files Created/Modified

- `apps/web/src/test/axe.ts` - `checkA11y(root?)` and `summarizeViolations`
- `apps/web/src/test/a11y.test.tsx` - axe table, light and dark, plus helper self-test
- `apps/web/src/test/live-regions.test.tsx` - live-region inventory and watcher self-test
- `apps/web/src/common/lib/contrast.ts` - `parseThemeTokens`, `relativeLuminance`, `contrastRatio`
- `apps/web/src/common/lib/contrast.test.ts` - contrast contract
- `apps/web/vitest.config.ts` - `css: { include: [/styles\.css\?raw$/] }` replaces `css: false`
- `apps/web/src/core/router/route-error.test.tsx` - axe assertion on the route-error screen, both themes
- `apps/web/package.json`, `package-lock.json` - `axe-core` 4.14.0

## Dependency justification (CLAUDE.md)

`axe-core` 4.14.0, exact pin, `devDependencies` of `@tfm/web` only (`npm ls axe-core -w @tfm/web` lists it; `apps/api` and `packages/contracts` manifests are untouched). It is the maintained WCAG rule engine (dequelabs/axe-core, no postinstall script, Package Legitimacy Audit verdict OK) and turns the DEMO-04 labelling, naming, landmark, heading and ARIA claims into tests. It never reaches the runtime image: the Dockerfile prod stage runs `npm ci --omit=dev --workspace=@tfm/api`. It was chosen over `vitest-axe` to avoid a second wrapper dependency.

## Decisions Made

- The no-`ring-ring` check strips `focus:ring-ring` before matching, because the skip link in `layouts/app-layout.tsx` deliberately keeps it (UI-SPEC Layout: it floats over the page, not on the sidebar). Sidebar and theme-toggle focus rings use `ring-sidebar-ring`.
- Loading lines are asserted only as `role="status"` ancestors (their container is rendered together with the skeleton by design); the mount-before-text rule is asserted for notices, counter, AI, upload and dialog lines.

## Deviations from Plan

None - plan executed exactly as written. No component needed a fix: every live-region row already had an always-mounted container, as the plan expected. No zero-violation run required an app change.

## Issues Encountered

- jsdom prints "Not implemented: HTMLCanvasElement's getContext()" while axe runs its icon-ligature rule. Harmless noise, no failures; left as is rather than adding the `canvas` package.
- The pre-commit hook rejected the first RED commit because the stub's unused underscore parameters tripped `no-unused-vars`; the stub now reads its arguments with `void`.

## Known Stubs

None.

## Threat Flags

None. Threat register items T-06-SC and T-06-19 are mitigated as planned (exact pin, workspace-scoped install, dev-only, absent from the prod image).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

DEMO-04 has automated evidence in both themes. Real browser focus rendering, painted contrast and the keyboard-only walk remain with the 06-17 manual pass.

## Self-Check: PASSED

- Files present: axe.ts, a11y.test.tsx, live-regions.test.tsx, contrast.ts, contrast.test.ts, vitest.config.ts change, route-error.test.tsx change, axe-core in apps/web/package.json.
- Commits `5418023`, `919f4d0`, `6307aef`, `2f89217` are ancestors of HEAD.
- `npm run typecheck`, `npm run lint` and `npm run test` (api 464, web 882, contracts 59) pass.

---
*Phase: 06-pulido-de-demo*
*Completed: 2026-11-06*
