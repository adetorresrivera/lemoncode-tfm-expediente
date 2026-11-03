---
phase: 02-candidaturas
plan: 08
subsystem: ui
tags: [react, tanstack-router, radix-collapsible, vitest, tailwind]
requires:
  - phase: 02-candidaturas
    provides: "02-07 GET /api/applications/:id (200 or 404 NOT_FOUND); 02-05/02-06 list pod, URL-backed list scene; 02-03 StatusBadge, TagChip, Skeleton, enum labels, format helpers, mockFetch"
provides:
  - "Route /applications/$applicationId, ApplicationDetailScene and the complete application-detail pod (api, vm, mapper, hook, container, component, six section components)"
  - "Navigation seam: scenes pass link render props (renderApplicationLink, renderListLink); pods never name a route"
  - "Card title as a stretched link to the detail, supplied by the list scene"
  - "Collapsible wrappers (Radix) in common/components/ui"
  - "getApplication, ApplicationDetailVm, mapApplicationFromApiToDetailVm, toSafeHttpUrl, useApplicationDetail, ApplicationDetailContainer({ applicationId, renderListLink })"
affects: [02-09 status change and delete, 02-10 form notice and heading focus, 02-12 edit link and edit-page states]
requirements-partial: ["APP-09: linked documents owned by Phase 5 (DOC-03, DOC-04); interview rounds by Phase 4 (INT-05)"]
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
  plan_head_before: 40d897bed50b31f768d2b94355350f2f9e7a5457
  plan_head_after: 75c69b5ca5960ea7370b00b870dbad46f5cc30f4
tech-stack:
  added: []
  patterns:
    - "Link render props from the scene: the pod calls renderListLink / renderApplicationLink with className and children and the scene returns a TanStack Link, so the DOM keeps a real anchor"
    - "Keyed-result detail hook (key = id + attempt), 404 NOT_FOUND mapped to its own notFound state"
    - "Optional offer rows and tag groups rendered only when present; empty-data fallbacks as muted lines"
key-files:
  created:
    - apps/web/src/pods/application-detail/api/api.ts
    - apps/web/src/pods/application-detail/application-detail.vm.ts
    - apps/web/src/pods/application-detail/application-detail.mapper.ts
    - apps/web/src/pods/application-detail/application-detail.hooks.ts
    - apps/web/src/pods/application-detail/application-detail.container.tsx
    - apps/web/src/pods/application-detail/application-detail.component.tsx
    - apps/web/src/pods/application-detail/application-detail.test.tsx
    - apps/web/src/pods/application-detail/components/offer-data-section.tsx
    - apps/web/src/pods/application-detail/components/tags-section.tsx
    - apps/web/src/pods/application-detail/components/notes-section.tsx
    - apps/web/src/pods/application-detail/components/offer-text-section.tsx
    - apps/web/src/pods/application-detail/components/status-history.tsx
    - apps/web/src/pods/application-detail/components/detail-states.tsx
    - apps/web/src/common/components/ui/collapsible.tsx
    - apps/web/src/scenes/application-detail.scene.tsx
    - apps/web/src/routes/applications/$applicationId/index.tsx
  modified:
    - apps/web/src/pods/application-detail/index.ts
    - apps/web/src/routeTree.gen.ts
    - apps/web/src/pods/application-list/components/application-card.tsx
    - apps/web/src/pods/application-list/application-list.component.tsx
    - apps/web/src/pods/application-list/application-list.container.tsx
    - apps/web/src/pods/application-list/application-list.test.tsx
    - apps/web/src/scenes/application-list.scene.tsx
    - apps/web/src/core/router/router.test.tsx
key-decisions:
  - "No dependency added: Collapsible comes from the installed radix-ui package; package.json and package-lock.json are unchanged"
  - "Navigation seam: scenes pass renderApplicationLink and renderListLink; a pod imports no router and names no route (guard grep passes)"
  - "Back link is a plain link to /applications and does not restore filters (UI-SPEC A-9, RESEARCH Open Question 5 resolved)"
  - "RenderListLink type lives in application-detail.vm.ts (React types only) and RenderApplicationLink in application-card.tsx"
  - "The route component is a named inline function inside createFileRoute: a top-level component next to Route trips react-refresh/only-export-components, and an anonymous arrow trips rules-of-hooks"
requirements-completed: [APP-09]
coverage:
  - id: D1
    description: "Each card title is a stretched link (single tab stop) to /applications/$applicationId, with sr-only company and focus ring on the article; the list scene supplies the router Link"
    requirement: APP-09
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-list/application-list.test.tsx#application cards"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#application detail navigation"
        status: pass
    human_judgment: false
  - id: D2
    description: "Detail header: back link «Mis candidaturas» (href /applications), eyebrow, h1 with min-w-0 break-words, company with muted location, StatusBadge, document.title"
    requirement: APP-09
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#ApplicationDetailContainer header"
        status: pass
      - kind: integration
        ref: "apps/web/src/core/router/router.test.tsx#application detail navigation"
        status: pass
    human_judgment: false
  - id: D3
    description: "Detail sections: optional offer rows, safe external link (http/https only, noopener noreferrer), grouped tags, notes and offer text as text nodes, collapsible offer text unmounted until opened, newest-first history with «Actual», no rounds or documents markup"
    requirement: APP-09
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#detail sections"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#toSafeHttpUrl"
        status: pass
    human_judgment: false
  - id: D4
    description: "Detail page states: skeleton with role=status and aria-busy, 404 not-found alert with link back, load error with fixed copy by code and «Reintentar»"
    requirement: APP-09
    verification:
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#detail page states"
        status: pass
      - kind: unit
        ref: "apps/web/src/pods/application-detail/application-detail.test.tsx#useApplicationDetail"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual fit of the detail at 360 px and 1024 px: wrapping of a 120-character title, 20 tag chips, a 15-entry history without inner scroll, timeline dots on the line, collapsible chevron rotation"
    verification: []
    human_judgment: true
    rationale: "jsdom cannot evaluate layout; classes follow the UI-SPEC but the rendered result needs a look in a real browser in both themes (UI-SPEC backstop rows)"
duration: 38min
completed: 2026-10-31
status: complete
---

# Phase 2 Plan 08: Application detail Summary

**Opening a card now lands on a read-only detail with offer data, grouped tags, notes, a collapsible original text and a newest-first status history, with scene-supplied links (real anchors) and loading, not-found and error states.**

## Performance

- **Duration:** 38 min
- **Tasks:** 2
- **Files modified:** 24 (16 created, 8 modified)

## Accomplishments

- Route `/applications/$applicationId`, `ApplicationDetailScene` and the detail pod in the course layout (api, vm, mapper, hook, container, component, `components/`). The pod has its own `getApplication` (id URL-encoded), a field-by-field `ApplicationDetailVm`, a keyed-result hook where `NOT_FOUND` becomes its own `notFound` state, and a container that sets `document.title` to «{title} · Expediente».
- Navigation seam: `ApplicationListContainer` and `ApplicationListComponent` take the required `renderApplicationLink`, the detail container takes `renderListLink`. The scenes return TanStack `Link` elements, so the card title, «Mis candidaturas» and «Volver a Mis candidaturas» keep `href`, Enter and open-in-new-tab. No pod imports the router or names a route (grep guard passes).
- Card (UI-SPEC §1): the h2 holds the scene link with `after:absolute after:inset-0` (single tab stop per card), the sr-only «, {company}» stays inside the link, the article gets `has-[a:focus-visible]:ring-2`.
- Sections: «Datos de la oferta» (optional rows only when present, Creada and Actualizada always, «Ver oferta original» only for http/https with `target="_blank" rel="noopener noreferrer"` and sr-only new-tab text), «Etiquetas» (six ordered groups, empty groups dropped, «Sin etiquetas.»), «Notas» (`whitespace-pre-wrap break-words`, «Sin notas.»), «Texto original de la oferta» (only when `offerText` exists, Radix Collapsible, content unmounted while closed) and «Historial de estados» (newest first, «Actual» on the first entry, never empty, no inner scroll). Nothing for rounds or documents is rendered.
- Page states: `DetailSkeleton` (`role="status"`, `aria-busy`, sr-only «Cargando candidatura…»), `DetailNotFound` and `DetailLoadError` (role=alert cards with the three fixed bodies by error code and «Reintentar»).

## Task Commits

1. **Task 1: Open an application from its card — route, scene, detail pod and header** - `169b6b3` (feat)
2. **Task 2: Detail sections, grouped tags, collapsible offer text and page states** - `75c69b5` (feat)

**Plan metadata:** the docs commit that adds this file.

## TDD Gate Compliance

The pre-commit hook runs the full suite, so a failing RED-only commit is impossible; each task is one commit holding tests and implementation. No separate `test(02-08)` commit exists (flagged on purpose).

- **Task 1 RED:** the new list-pod card-link test failed on its assertion («Unable to find an accessible element with the role link») before `ApplicationCard` was changed. The detail pod tests, the mapper and router tests were written after the pod files, so for them there was no RED run; they passed on the first run (112 tests). This is a weaker RED than plans 02-03 to 02-05; recorded here instead of claimed.
- **Task 2 RED:** the 15 new component and state tests failed on assertions (missing sections, skeleton, alert) against the Task 1 minimal states (15 failed, 20 passed). GREEN: 72 tests in `src/pods/application-detail` and `src/core/router` after three test-side fixes (see Issues).
- `check tdd-red-evidence` was not run (project reporter is not TAP).

## Files Created/Modified

- `pods/application-detail/*` - full pod; `components/` holds `OfferDataSection`, `TagsSection`, `NotesSection`, `OfferTextSection`, `StatusHistory`, `DetailSkeleton`, `DetailNotFound`, `DetailLoadError`
- `common/components/ui/collapsible.tsx` - Radix Collapsible wrappers with `data-slot`
- `scenes/application-detail.scene.tsx`, `routes/applications/$applicationId/index.tsx`, `routeTree.gen.ts` (regenerated by `npm run build -w @tfm/web`)
- `pods/application-list/components/application-card.tsx`, `application-list.component.tsx`, `application-list.container.tsx`, `scenes/application-list.scene.tsx` - `renderApplicationLink` threaded to the card
- Tests: `application-detail.test.tsx` (new), `application-list.test.tsx` and `router.test.tsx` (extended)

## Decisions Made

- No dependency added (`package.json` and the lockfile are unchanged); Collapsible comes from the installed `radix-ui`.
- Back link is a plain link to `/applications` and does not restore filters (UI-SPEC A-9, RESEARCH Open Question 5).
- The route component is a named function inside `createFileRoute({ component: function ApplicationDetailRoute() {...} })`: a top-level component beside `Route` fails `react-refresh/only-export-components`, and an anonymous arrow fails `rules-of-hooks`.
- The history list `key` combines status, date label and position from the end, so a stable timeline does not remount entries.

## Deviations from Plan

None - plan executed exactly as written. The only additions are test-harness details inside the plan's own test files.

## Issues Encountered

- Three test-side fixes after the first Task 2 GREEN run: the status label also appears in the history, so header assertions are scoped to the `h1`'s `header`; the salary line contains non-breaking spaces from `Intl`, so the test normalises whitespace instead of comparing the literal; the `router.test.tsx` assertions use `main` for the back link because the sidebar nav also has a «Mis candidaturas» link.
- The sandbox rejected several compound shell commands (heredocs mixed with git or cd words), so large files were written with the Write tool. No effect on the result.
- The plan commit ledger `gsd-plan-head-before-02-08` was written by hand with the dispatch base `40d897b`; `commits: 2` is measured from it.

## Known Stubs

None. The «Editar» action, status selector and «Eliminar» are not rendered on purpose: they arrive with plans 02-09 and 02-12 (the plan ships the read-only detail).

## Threat Flags

None. T-02-17 is mitigated (`toSafeHttpUrl` re-checks the protocol, `rel="noopener noreferrer"`, tests for `javascript:`, `data:` and garbage; a legacy `javascript:` URL renders no row and no link). T-02-18 is mitigated (notes and offer text are React text nodes, tests render an `<img onerror>` string literally, `dangerouslySetInnerHTML` is absent from `apps/web/src`). T-02-SC: no install.

## User Setup Required

None - no external service configuration required.

## Partial requirements

APP-09 is delivered **partially**: every clause except «linked documents», which Phase 5 (DOC-03, DOC-04) delivers, and the interview rounds section, which Phase 4 (INT-05) delivers. It is kept in `requirements-completed` as this plan's share; `requirements-partial` in the frontmatter keeps it open for phase verification and REQUIREMENTS.md traceability until Phase 5.

## Next Phase Readiness

- Plan 02-09 can add the status selector, «Eliminar» and its dialog to `ApplicationDetailContainer` and the component header (an `onDeleted` prop, a status row next to `StatusBadge`).
- Plans 02-10 and 02-12 add `notice`, `focusHeadingRef` and `renderEditLink` on the same container; the `h1` already has `tabIndex={-1}` and the link render-prop shape is established.
- A human should open the detail at 360 px and 1024 px in both themes (coverage D5).

## Self-Check: PASSED

- Created files exist on disk (collapsible, six section components, scene, route, pod files) and commits `169b6b3`, `75c69b5` are ancestors of HEAD.
- Acceptance criteria of both tasks pass: route file and `routeTree.gen.ts` entry, `after:inset-0` and `renderApplicationLink` in the card, `renderApplicationLink` and `renderListLink` in the scenes, no `"/applications` or router import in non-test pod files, `ApplicationDetailContainer` exported, no pod imports another pod, `noopener noreferrer`, `whitespace-pre-wrap` in notes and offer text, «Mostrar texto original», «Historial de estados» and «Actual», «No encontramos esta candidatura», no `dangerouslySetInnerHTML`, no rounds or documents markup.
- `npm run typecheck`, `npm run lint`, `npm run build -w @tfm/web` and `npm run test` (contracts 55, api 105, web 187) pass.

---
*Phase: 02-candidaturas*
*Completed: 2026-10-31*
