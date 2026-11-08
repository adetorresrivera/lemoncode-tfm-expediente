---
phase: 02-candidaturas
plan: 10
subsystem: ui
tags: [react, tanstack-form, tanstack-router, zod, vitest]
requires:
  - phase: 02-candidaturas
    provides: "02-09 useArrivalNotice and the HistoryState { focusHeading, notice } augmentation; 02-08 detail pod and the link render-prop seam; 02-05/02-06 list pod and scene; 02-03 Input, Label, RequestStatus; 02-01 applicationInputSchema and POST /api/applications"
provides:
  - "@tanstack/react-form 1.33.5 (exact pin) with devtools-event-client resolved to 0.4.4, approved by a human before install"
  - "application-edit pod: ApplicationFormValues / FormFieldName / EMPTY_FORM_VALUES / FormMessage / RenderCancelLink (vm), mapFormValuesToApiInput / validateApplicationForm / issueToMessage / mapServerErrorToFields / toLocalNoonIso (mapper), createApplication (api), useApplicationForm / ApplicationFormApi (hooks), FormField / controlProps / firstFieldError / JobSection, ApplicationEditContainer (index)"
  - "Route /applications/new and ApplicationEditScene (create mode): save replaces the form entry with /applications/<id> and state { focusHeading, notice: «Candidatura creada.» }; «Descartar cambios» returns to /applications with focus on its h1"
  - "List entry points: primary «Añadir candidatura» link in the scene header and renderCreateLink threaded container -> component -> EmptyState for «Añadir la primera candidatura»"
  - "Detail container/component props notice and focusHeadingRef, wired from useArrivalNotice in the detail scene"
affects: [02-11 Condiciones/Seguimiento/Etiquetas sections extend the VM, mapper table and form, 02-12 edit mode reuses the container, hooks and scene, Phase 3 paste panel above the form, Phase 5 documents section]
actuals:
  tokens: 20000
  tasks: 3
  commits: 2
  plan_head_before: e0c2bcdd0c45d53df95f487ee15a40f5ea1194f0
  plan_head_after: 5826dbd3a70b146bf04f88d531ad145d20bbf75c
tech-stack:
  added: ["@tanstack/react-form 1.33.5"]
  patterns:
    - "Form values are a VM of strings; the contracts schema is applied through a wrapper (VM -> API draft -> safeParse with reportInput -> Spanish message by path[0] and code)"
    - "TanStack Form with revalidateLogic({ mode: submit, modeAfterSubmission: change }), validators.onDynamic for client rules and onSubmitAsync for the save so a server 400 comes back as field errors in the same channel"
    - "Double-submit guard on two levels: the submit handler ignores form.state.isSubmitting and onSubmitAsync ignores a call while a save is in flight (the button is aria-disabled, never disabled)"
    - "Pods get every link target from the scene through render props (renderCancelLink, renderCreateLink)"
key-files:
  created:
    - apps/web/src/pods/application-edit/api/api.ts
    - apps/web/src/pods/application-edit/application-edit.vm.ts
    - apps/web/src/pods/application-edit/application-edit.mapper.ts
    - apps/web/src/pods/application-edit/application-edit.hooks.ts
    - apps/web/src/pods/application-edit/application-edit.container.tsx
    - apps/web/src/pods/application-edit/application-edit.component.tsx
    - apps/web/src/pods/application-edit/application-edit.test.tsx
    - apps/web/src/pods/application-edit/components/form-field.tsx
    - apps/web/src/pods/application-edit/components/field-props.ts
    - apps/web/src/pods/application-edit/components/job-section.tsx
    - apps/web/src/scenes/application-edit.scene.tsx
    - apps/web/src/routes/applications/new.tsx
  modified:
    - apps/web/package.json
    - package-lock.json
    - apps/web/src/routeTree.gen.ts
    - apps/web/src/pods/application-edit/index.ts
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/pods/application-list/components/empty-state.tsx
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - apps/web/src/scenes/application-detail.scene.tsx
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
    - apps/web/src/core/router/router.test.tsx
key-decisions:
  - "Dependency justification (CLAUDE.md): @tanstack/react-form is mandated by the course stack in CLAUDE.md (TanStack Form); it is the only new dependency of Phase 2. Installed with --save-exact at 1.33.5 after a blocking human legitimacy check (publisher TanStack, repo github.com/TanStack/form, maintainers tannerlinsley, alemtuzlak, kevinvandy, about 5.87M weekly downloads, no preinstall/install/postinstall scripts)"
  - "Resolved tree (npm ls): @tanstack/react-form 1.33.5 -> @tanstack/form-core 1.33.5 (-> @tanstack/devtools-event-client 0.4.4, @tanstack/pacer-lite 0.1.1, @tanstack/store 0.11.2) and @tanstack/react-store 0.11.2 (-> @tanstack/store 0.11.2 deduped). The flagged transitive resolved to 0.4.4 on its own, so NO overrides pin was added (root package.json untouched)"
  - "Form values hold strings and validation reuses the contracts schema through a wrapper; the safeParse runs with reportInput so the empty-title case (Escribe el puesto.) can be told from the one-character case, which Zod reports with the same too_small code"
  - "Control aria helpers live in components/field-props.ts, not in form-field.tsx: the repo lint (react-refresh/only-export-components, --max-warnings=0) rejects a component file that also exports functions"
  - "The save runs inside validators.onSubmitAsync (as planned); because TanStack Form calls onSubmitInvalid for any non-empty submit error, a server 400 also shows «Revisa los campos marcados.» next to the field errors"
  - "The creation notice line mounts with the loaded detail view (under the header), after the loading skeleton; empty:-mt-6 cancels its flex gap while it is empty"
patterns-established:
  - "FormField + controlProps({ id, hint, error, required }) is the per-field wiring plans 02-11 and 02-12 reuse; ids are field-<name>, hint id <id>-hint, error id <id>-error"
  - "Scenes pass navigation intent (replace + history state { focusHeading, notice }); destination scenes consume it with useArrivalNotice"
requirements-completed: [APP-01]
coverage:
  - id: D1
    description: "Legitimacy gate: the human approved @tanstack/react-form 1.33.5 and its transitive before any install; the lockfile resolves react-form 1.33.5 and only devtools-event-client 0.4.4, with no install scripts"
    requirement: "APP-01"
    verification:
      - kind: other
        ref: "npm ls @tanstack/react-form @tanstack/devtools-event-client; npm view @tanstack/react-form@1.33.5 scripts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mapper: untouched optional fields become null (never an empty string), salaries and currency rules, local-noon date, Spanish message for every row of the UI-SPEC validation table, server 400 details mapped to fixed field messages"
    requirement: "APP-01"
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#mapFormValuesToApiInput"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#validateApplicationForm"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#mapServerErrorToFields"
        status: pass
    human_judgment: false
  - id: D3
    description: "Create form behavior: errors on first submit then live, invalid submit message and focus on the first aria-invalid control, one POST with the validated draft, Guardando… with aria-disabled and a single POST on repeated clicks, 500 / network / 400-with-details error handling that keeps the values"
    requirement: "APP-01"
    verification:
      - kind: automated_ui
        ref: "apps/web/src/pods/application-edit/application-edit.test.tsx#ApplicationEditContainer"
        status: pass
    human_judgment: false
  - id: D4
    description: "Create flow end to end in the router: header link and empty-state link to /applications/new, save lands on /applications/<id> with the h1 focused and «Candidatura creada.» shown once (history entry replaced), a fresh load shows no notice, «Descartar cambios» returns to the list with focus and no request"
    requirement: "APP-01"
    verification:
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#create an application"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#empty states"
        status: pass
      - kind: automated_ui
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#arrival notice"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual and keyboard pass of the create form at 360 px and 1024 px in both themes (label and error layout, focus ring, full-width buttons below sm, list header action wrap)"
    verification: []
    human_judgment: true
    rationale: "jsdom cannot judge layout, focus ring visibility or contrast; harvested by the end-of-phase UAT"
duration: 40min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 10: Create an application from the UI Summary

**Create path of the shared form: pinned @tanstack/react-form behind a human legitimacy gate, a string-VM form whose Spanish validation reuses the contracts schema through a wrapper, POST with server-error mapping, and a landing on the new detail with focus and a one-shot «Candidatura creada.» notice, reachable from the list header and the empty state**

## Performance

- **Duration:** about 40 min (continuation after the Task 1 human approval)
- **Tasks:** 3 (Task 1 was the human checkpoint; Tasks 2 and 3 produced commits)
- **Files modified:** 28 (12 created, 16 modified, counting package.json and the lockfile)

## Accomplishments

- Task 1 (checkpoint, no commit): the human replied "approved" on 2026-10-31 before any change to `apps/web/package.json` or `package-lock.json`, after seeing the registry facts for `@tanstack/react-form` 1.33.5 and the flagged `@tanstack/devtools-event-client`.
- Install and assertions: `npm install --save-exact @tanstack/react-form@1.33.5 -w @tfm/web` added 4 packages; the package.json pin is exactly `1.33.5`, `npm ls` shows `@tanstack/devtools-event-client@0.4.4` (no 0.5.x anywhere), `npm view @tanstack/react-form@1.33.5 scripts` lists only build/test scripts (no preinstall, install or postinstall), and the lockfile is committed. No `overrides` entry was needed.
- `/applications/new` shows «Añadir candidatura», the intro «Los campos con * son obligatorios.» and the section «Puesto y empresa» with «Puesto *» and «Empresa *». Every control has a visible label, `aria-required`, `aria-invalid` when invalid and `aria-describedby` pointing at the hint and error lines that exist; the form uses `noValidate`.
- Validation: the contracts schema is applied through `validateApplicationForm` (VM -> `mapFormValuesToApiInput` -> `safeParse`), and `issueToMessage` implements the whole UI-SPEC table by `path[0]` and code. Errors appear on the first submit and then update while typing; an invalid submit shows «Revisa los campos marcados.» and focuses the first `aria-invalid` control.
- Save: one POST with `content-type: application/json` and the schema-validated draft (all untouched optionals `null`); a second click while «Guardando…» (`aria-disabled`) sends nothing; a 400 with `fieldErrors` becomes «Revisa este campo.» on the named fields (never server text) with focus on the first; any other failure shows the generic or the network copy and keeps every value.
- On success the scene navigates to `/applications/<id>` with `replace: true` and state `{ focusHeading: true, notice: "Candidatura creada." }`; the detail scene feeds `useArrivalNotice` into the container, so the h1 gets focus and the polite line announces the notice once (a fresh load of the same URL shows neither).
- Entry points: a primary «Añadir candidatura» link (Plus icon, `h-11`) in the list header and the outline «Añadir la primera candidatura» in the empty state, both rendered by the pods from scene-supplied render props; «Descartar cambios» goes to `/applications` with `focusHeading`.

## Task Commits

1. **Task 1: Human legitimacy check** - no commit (checkpoint:human-verify, `gate="blocking-human"`, answered "approved" by the human before any change)
2. **Task 2: Create from /applications/new (install, form pod, validation, POST, landing)** - `5301c09` (feat; RED and GREEN together, see TDD Gate Compliance)
3. **Task 3: Entry points to the form and the arrival notice on the detail** - `5826dbd` (feat; same)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `apps/web/package.json`, `package-lock.json` - the exact pin `@tanstack/react-form` 1.33.5 and 67 lockfile lines (4 packages)
- `pods/application-edit/application-edit.vm.ts` - `ApplicationFormValues` (written field by field, no `extends`/`Omit`), `FormFieldName`, `EMPTY_FORM_VALUES`, `FormMessage`, `RenderCancelLink`
- `pods/application-edit/application-edit.mapper.ts` - pure mapping, Spanish messages, server error mapping, local-noon helper
- `pods/application-edit/application-edit.hooks.ts` - `useApplicationForm` (revalidateLogic, onDynamic, onSubmitAsync save, onSubmitInvalid focus) and `ApplicationFormApi`
- `pods/application-edit/api/api.ts`, `application-edit.container.tsx`, `application-edit.component.tsx`, `index.ts` - POST, container (create mode), form markup and actions, barrel exporting only the container
- `pods/application-edit/components/form-field.tsx`, `field-props.ts`, `job-section.tsx` - field chrome, aria wiring helpers, the «Puesto y empresa» section
- `scenes/application-edit.scene.tsx`, `routes/applications/new.tsx`, `routeTree.gen.ts` (regenerated by `npm run build -w @tfm/web`)
- `scenes/application-list.scene.tsx`, `pods/application-list/components/empty-state.tsx`, `application-list.component.tsx`, `application-list.container.tsx` - header link and `renderCreateLink` threading
- `scenes/application-detail.scene.tsx`, `pods/application-detail/application-detail.container.tsx`, `application-detail.component.tsx` - `notice` and `focusHeadingRef`
- Tests: `application-edit.test.tsx` (27 new), `application-list.test.tsx` (2 new, stubs updated), `application-detail.test.tsx` (2 new, props added), `router.test.tsx` (6 new)

## Decisions Made

See `key-decisions` in the frontmatter. Notable: the dependency justification and resolved versions, no `overrides` pin needed, `reportInput` to distinguish an empty title from a one-character one, and the aria helpers in a non-component file to satisfy the repo lint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Aria helpers moved out of form-field.tsx**
- **Found during:** Task 2 (design before writing; the repo runs ESLint with `--max-warnings=0` and `react-refresh/only-export-components`)
- **Issue:** the plan asks `form-field.tsx` to export the `FormField` component and a helper that builds the control props; a component file that also exports functions is a lint warning, which fails the lint gate
- **Fix:** `FormField` stays in `components/form-field.tsx`; `controlProps` and `firstFieldError` live in `components/field-props.ts` (not in the plan's file list)
- **Files modified:** `components/field-props.ts` (new), `components/form-field.tsx`
- **Verification:** `npm run lint` clean
- **Committed in:** 5301c09

**2. [Rule 3 - Blocking] application-detail.test.tsx updated for the new required props**
- **Found during:** Task 3 (RED run and typecheck)
- **Issue:** `notice` and `focusHeadingRef` are required props of the detail container and component, so every existing render in `application-detail.test.tsx` (not in the plan's file list) stopped compiling; the new always-present notice line also made the ten existing `getByRole("status")` calls in the loaded view ambiguous
- **Fix:** passed `notice=""` and a no-op `focusHeadingRef` in every render, and added a `feedbackLine()` helper that returns the first polite region of the loaded view (the status-change feedback inside the header; the notice line follows the header); the loading-state query is unchanged
- **Files modified:** `application-detail.test.tsx`
- **Verification:** all 55 detail tests pass; two new tests cover the notice and the heading ref
- **Committed in:** 5826dbd

**3. [Rule 1 - Bug] Test mocks passed Response objects as JSON bodies**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** `mockFetch` treats a non-function route value as a JSON body, so `jsonResponse(...)` given directly was serialized as `{}`; the 500 and 400 tests would have passed for the wrong reason
- **Fix:** the route values are functions returning the `Response`
- **Files modified:** `application-edit.test.tsx`
- **Verification:** the 201, 500, network and 400 cases each assert their specific copy
- **Committed in:** 5301c09

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug in test setup)
**Impact on plan:** none on scope or interfaces; the binding signatures of the plan's `<interfaces>` block are unchanged.

## TDD Gate Compliance

The pre-commit hook runs typecheck and the whole suite, so a failing RED-only commit is impossible; RED was run locally and RED plus GREEN were committed together for both tasks (no `test(02-10)` gate commit exists; flagged on purpose, as in earlier plans).

- **Task 2 RED:** with `application-edit.vm.ts` real and stub mapper/container (mapper functions throwing or returning wrong values, container rendering null), `application-edit.test.tsx` ran with 26 failed and 1 passed (the "valid values give undefined" case that a stub returning undefined satisfies). Failures were assertion failures on the planned behavior (`Unable to find a label with the text of: Puesto *`, wrong mapper outputs), not load errors; the file loaded and every test executed. semanticAssessment: valid RED. After the real mapper, 10 component tests still failed for the right reason (no UI yet); the final GREEN is 27 of 27.
- **Task 3 RED:** the new tests were run before the implementation: 6 failed, 149 passed (list header link, empty-state link through `renderCreateLink`, create flow in the router, two detail notice tests). The discard, fresh-load and form-heading router tests passed immediately because Task 2 and plan 02-09 already provided that behavior; they are regression guards, not RED evidence. semanticAssessment: valid RED for the six.
- `check tdd-red-evidence` was not run (project reporter is not TAP).

## Issues Encountered

- The worktree has no `node_modules`; `npm ci` was run first, then the approved install from the worktree root so only this worktree's `package.json` and lockfile changed.
- The sandbox rejected compound shell commands that mix a heredoc with git; large edits were done with Python heredocs in a separate call or with the Write tool.
- TanStack Form lets a second `handleSubmit` run when `submissionAttempts` is above one (it only blocks the first invalid attempt), so the double-submit guard is ours (submit handler plus a ref inside `onSubmitAsync`).

## Known Stubs

None. `offerText`, `cvDocumentId` and `coverLetterDocumentId` are sent as `null` on create by design (no inputs in Phase 2); Phase 3 adds the paste panel and Phase 5 the documents section. The created application uses status `guardada`, no tags and no conditions until plan 02-11 adds those sections.

## Threat Flags

None. T-02-23 / T-02-SC are mitigated by the blocking human check, the exact pin, the `npm ls` assertion and the committed lockfile; T-02-25 by `mapServerErrorToFields`, which keeps only field names and shows the fixed «Revisa este campo.» (a test asserts the server text «bad» never renders); T-02-24 is accepted (the API validates with the same schema).

## Hand-over notes

- **02-11:** extend `ApplicationFormValues` only by adding sections; the VM already carries `workMode`, `seniority`, `contractType`, `location`, salaries, `currency`, `tags`, `status`, `appliedAt`, `sourceUrl` and `notes`, and the mapper and the whole Spanish message table are complete. New sections call `controlProps`/`firstFieldError` and `FormField` (ids `field-<name>`). Tag-level errors (`tags`) are produced by the mapper under `fields.tags`.
- **02-12:** `ApplicationEditContainer` declares `applicationId?` but ignores it (create only); edit mode needs initial values from a mapper, `save` = PUT and the scene header «Editar candidatura». The PUT whitelist trap of RESEARCH Q9 stands: the form never sends `offerText` or the document ids as anything but `null`, so PUT must not write them.
- **Phase 3:** the «Pegar oferta» panel goes above the form in the edit scene; `offerText` must then move from the fixed `null` in `mapFormValuesToApiInput` to a VM field.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 02-11 can add Condiciones, Seguimiento and Etiquetas to the same form; 02-12 can reuse the container, hooks and scene for edit.
- Verification at the end of this plan: `npm run typecheck`, `npm run lint`, `npm run build` and `npm run test` pass (contracts 55, api 123, web 240).
- A human should open `/applications/new` at 360 px and 1024 px in both themes (coverage D5).

## Self-Check: PASSED

- Created files exist on disk: the 12 files under `key-files.created` (FOUND).
- Commits `5301c09` and `5826dbd` are ancestors of HEAD.
- Acceptance criteria of Tasks 2 and 3 pass (exact pin, `npm ls` 1.33.5 / 0.4.x only, no `extends`/`Omit`/`Pick` in the VM, `renderCancelLink` in scene and component, route and tree entry, `revalidateLogic`, Spanish message strings, `noValidate`, `ApplicationEditContainer` export, `renderCreateLink` in empty state and list scene, no pod names a route or imports the router, `useArrivalNotice` in the detail scene, `Candidatura creada.` in the edit scene).
- Plan-level verification: `npm ls @tanstack/devtools-event-client` shows only 0.4.4; `npm run typecheck && npm run test && npm run lint` exit 0.

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
