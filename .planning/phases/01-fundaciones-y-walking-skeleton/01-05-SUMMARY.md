---
phase: 01-fundaciones-y-walking-skeleton
plan: 05
subsystem: ui
tags: [react, tanstack-router, shadcn, radix, tailwind, theme, vitest, testing-library]

requires:
  - phase: 01-fundaciones-y-walking-skeleton
    provides: "Plan 01-04 router (createAppRouter), DS stylesheet byte copy, Vitest harness with matchMedia stub, application-list scene"
provides:
  - "shadcn primitives Button, Sheet, Separator, Toggle, ToggleGroup on DS tokens with a local cn helper"
  - "Theme store (Sistema / Claro / Oscuro) persisted in localStorage with matchMedia sync and useSyncExternalStore hook"
  - "ThemeToggle component and pre-hydration script in index.html"
  - "AppLayout: fixed sidebar from 1024 px, header + Sheet below, wired as the root route component"
affects: [phase-02 applications screens (render inside AppLayout), phase-03 AI panel, phase-05 documents nav item]

actuals:
  tokens: 7400
  tasks: 3
  commits: 3
plan_head_before: 62150ad7b1495611df3c8b837539e1a0a5072529
plan_head_after: dde141bf9848205bf47e71c3392e52fb83e7d468

tech-stack:
  added: []
  patterns:
    - "shadcn CLI used only through npx (pinned 4.21.5); components.json hand-written; generated files post-processed (cn import, DS tokens, Prettier)"
    - "Theme: dark class on html, localStorage key expediente-theme read/written in try/catch, invalid values fall back to system"
    - "Radix ToggleGroup single emits an empty string on re-click; guarded with isThemePreference"
    - "Shell tests render RouterProvider with createAppRouter(createMemoryHistory(...)) and scope queries with within()"

key-files:
  created:
    - apps/web/components.json
    - apps/web/src/common/lib/utils.ts
    - apps/web/src/common/components/ui/button.tsx
    - apps/web/src/common/components/ui/sheet.tsx
    - apps/web/src/common/components/ui/separator.tsx
    - apps/web/src/common/components/ui/toggle.tsx
    - apps/web/src/common/components/ui/toggle-group.tsx
    - apps/web/src/core/theme/theme.ts
    - apps/web/src/core/theme/theme.test.ts
    - apps/web/src/common/components/theme-toggle.tsx
    - apps/web/src/layouts/app-layout.tsx
    - apps/web/src/layouts/app-layout.test.tsx
  modified:
    - apps/web/index.html
    - apps/web/src/main.tsx
    - apps/web/src/routes/__root.tsx
    - apps/web/src/core/router/router.test.tsx

key-decisions:
  - "No dependency added: shadcn CLI used via npx only; the cn package it injects was removed and the lockfile restored"
  - "ThemeToggle fills its container (w-full, flex-1 items, text-xs) so the three options fit the 16rem sidebar"
  - "Storage failure keeps the theme applied for the session but the toggle then reflects the stored/default value (no in-memory fallback); judged acceptable for a single-user local app"

patterns-established:
  - "Generated shadcn files: replace non-DS colour utilities with tokens and translate English strings to Spanish"
  - "AppLayout navigation component reused in sidebar and Sheet, with onNavigate closing the Sheet"

requirements-completed: [FND-05, FND-06, FND-07]

duration: 25min
completed: 2026-10-29
status: complete
---

# Phase 1 Plan 05: Shell, theme and shadcn primitives Summary

**Expediente shell with a fixed sidebar from 1024 px, a header + Sheet menu below, and a persisted Sistema / Claro / Oscuro theme with a pre-hydration script, built on shadcn primitives over the DS tokens.**

## Performance

- **Tasks:** 3 of 3
- **Files:** 16 touched (12 created, 4 modified); scope exception for 16 files was pre-approved in the plan frontmatter

## Accomplishments

- Five shadcn primitives generated with `npx -y shadcn@4.21.5 add button sheet separator toggle-group --yes` (CLI created exactly: button, sheet, separator, toggle, toggle-group) without touching `styles.css` (still byte-identical to `docs/design/expediente.css`).
- Theme store and `ThemeToggle`: system by default, choice persisted, system changes followed only while the preference is Sistema, storage errors harmless, unknown stored values fall back to Sistema, dark class set before first paint by the inline script in `index.html`.
- `AppLayout` wraps every route: sidebar with brand in serif, «Principal» navigation (active «Mis candidaturas»; «Tablero» and «Documentos» as `aria-disabled` spans with «Próximamente»), theme switch at the foot; below `lg` a header with «Abrir menú» opening a Sheet with title, sr-only description, the same navigation and theme switch; following a link closes it.

## Task Commits

1. **Task 1: shadcn primitives** - `f2cba26` (feat)
2. **Task 2: theme store, toggle, pre-hydration script** - `c5dff21` (feat)
3. **Task 3: AppLayout wired as root layout** - `dde141b` (feat)

## CLI output and post-steps (Task 1)

- CLI output: "Created 5 files" (button, sheet, separator, toggle, toggle-group); it also added `"cn": "^0.5.0"` to `apps/web/package.json` and the matching lockfile entry.
- Post-steps applied: (a) `from "cn"` rewritten to `from "@/common/lib/utils"` in all five files; (b) `git checkout -- apps/web/package.json package-lock.json` then `npm ci` (verified `node_modules/cn` absent, `"cn"` absent from package.json, no `from "cn"` left); (c) `styles.css` not modified by the CLI, verified with `cmp`; (d) colour utilities: Sheet overlay `bg-black/50` -> `bg-sidebar/70`, Button destructive `text-white` -> `text-destructive-foreground`; (e) Prettier run on the generated files.
- Icon names: `Briefcase`, `LayoutDashboard`, `FileText`, `Menu`, `Monitor`, `Sun`, `Moon` all exist in lucide-react 1.57.0; no substitution.
- **No dependency added (shadcn CLI used via npx only).**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing router test broke once the shell rendered the brand**
- **Found during:** Task 3
- **Issue:** `router.test.tsx` used `screen.getByText("Expediente")`, which now matches the sidebar brand, header brand and scene eyebrow.
- **Fix:** scoped the query to the `main` landmark with `within(screen.getByRole("main"))`.
- **Files modified:** apps/web/src/core/router/router.test.tsx
- **Commit:** dde141b

**2. [Rule 2 - Missing critical] Generated Sheet close button label was English («Close»)**
- **Found during:** Task 3
- **Issue:** UI copy must be Spanish; the accessible name of the close control was English.
- **Fix:** changed the sr-only text to «Cerrar».
- **Files modified:** apps/web/src/common/components/ui/sheet.tsx
- **Commit:** dde141b

**3. [Rule 1 - Layout] ThemeToggle overflowed the 16rem sidebar**
- **Found during:** Task 3 (by width estimate; not visually verified)
- **Fix:** `w-full` group, `flex-1 gap-1 px-1.5 text-xs` items in `theme-toggle.tsx`.
- **Commit:** dde141b

### TDD ordering deviation

Tasks 2 and 3 are `tdd="true"`, but the Husky pre-commit hook runs `npm run typecheck`, so a RED-only commit importing missing modules cannot be committed. Tests and implementation were written together and committed together (feat commits). No `--no-verify` was used. No separate `test(...)` RED commit exists.

### Test file extension

The plan names `theme.test.ts` yet requires rendering `ThemeToggle`; JSX is not allowed in `.ts`, so the test uses `createElement(ThemeToggle)`.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` all exit 0.
- `npm run test -w @tfm/web`: 6 files, 40 tests passed (includes `src/core/theme/theme.test.ts` and `src/layouts/app-layout.test.tsx`). One aggregate `npm run test` run reported web as "no tests / 6 errors" (the known startup flake from the environment notes); the web suite passed on immediate re-run.
- Palette/hex gate over `apps/web/src/**/*.tsx` finds nothing; `cmp docs/design/expediente.css apps/web/src/styles.css` identical; `routeTree.gen.ts` unchanged by the build.
- Built CSS contains `lg:fixed`, `lg:hidden`, `bg-sidebar/70` and the `data-[status=active]` rules.

## Backstop checks pending (manual, end of phase)

- Sidebar visible at exactly 1024 px and replaced by the header at 1023 px (jsdom does not evaluate CSS; the `lg:` classes are present in source and built CSS).
- No light frame on reload with Oscuro (pre-hydration script); Sheet focus trap and Esc returning focus; ThemeToggle fit in the sidebar width.

## Known Stubs

None. «Tablero» and «Documentos» are intentional disabled placeholders per D-17; they are enabled in later phases.

## Threat Flags

None. The inline pre-hydration script is first-party, static and only toggles a class (T-01-22 accepted); the shadcn supply chain is mitigated (T-01-20, T-01-SC): pinned CLI, manifests restored, `cn` absent.

## Self-Check: PASSED

- Files created exist (components.json, utils.ts, five ui primitives, theme.ts, theme.test.ts, theme-toggle.tsx, app-layout.tsx, app-layout.test.tsx).
- Commits f2cba26, c5dff21, dde141b are on the branch.
