---
phase: "06"
slug: "pulido-de-demo"
audited: "2026-11-07"
baseline: "06-UI-SPEC.md (A1-A10)"
overall: 19
---

# Phase 06 — UI Review

Retroactive 6-pillar audit (`/gsd-ui-review 06`, gsd-ui-auditor, code-only plus the screenshots of the 06-17 automated Playwright pass). The orchestrator wrote this file from the auditor's returned report and checked its warnings against the repository (see «Orchestrator verification»).

## Pillar scores

| Pillar | Score | Key finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | New Spanish strings match the contract verbatim; «Reintentar» kept as the declared inherited exception |
| 2. Visuals | 3/4 | Focal points hold; after the 44 px fixes the list filter card is about 24 px taller (denser) |
| 3. Color | 3/4 | No hex, palette or `dark:` literals outside `styles.css`; A1 destructive sweep complete; dark contrast not re-measured in this audit (covered by the 06-12 contrast tests) |
| 4. Typography | 4/4 | Only 11 / 14 / 16 / 28 px and weights 400 / 600; no off-scale classes outside `/ui/` |
| 5. Spacing | 3/4 | Off-scale sweep (A2) clean; 44 px chips and filters make the filter area denser |
| 6. Experience Design | 3/4 | Skip link, focus rings, `aria-disabled` close lock, live regions, error screens in place; S10 not captured in a browser |

**Overall: 19/24**

## Verified in code

- Typography: `text-[11px]`, `text-[28px]`, `text-base`, `text-sm` only; `font-normal` / `font-semibold` only.
- No `text-destructive` on icons or text outside the `Button` primitive (A1).
- Shell: skip link first, focus to `main#main-content`; sidebar rings `ring-sidebar-ring`; menu button `size-11`; wordmark `font-serif text-[28px] font-normal` in the three places (A4, A8).
- ThemeToggle: `aria-label="Tema"`, items `h-auto min-h-11 px-1 py-1` (A9).
- Error screens: exact copy, `h1` focused on mount, `role="alert"`, `h-11` buttons, `error.message` never rendered; router wires `defaultNotFoundComponent`, `defaultErrorComponent` and the root `errorComponent`.
- Dialog close lock (`closeDisabled` → `aria-disabled`) in the upload and round dialogs.
- Live regions across list, detail, documents, form and dialogs.
- The 44 px findings of the human pass (status filter, stack chips, «Ver oferta original», tag remove, Sheet «Cerrar») and the reduced-motion dialog fades are fixed (98e5c63, bd6f63b).
- `docs/img/application-list.png`: 1280 × 800, 63 KB, light, seeded list, no dialog (D-22).

## Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | warning | S10 (forced route error) never captured in a browser at 3 widths × 2 themes | Open, accepted exception: the production build cannot force a route error; covered by `route-error.test.tsx` and the S9 card layout (noted in `06-UAT.md`). Remedy if wanted: a dev-only throwing route, captured at 360 / 768 / 1280 in both themes |
| 2 | warning | UAT evidence provenance (human vs automated) unclear | Not reproduced: `06-UAT.md` labels every result — screenshot, focus walks and re-checks «automated Playwright pass», timed runs «presenter's stopwatch» |
| 3 | warning | Reset-on-open not verified for the round and document delete dialogs | Not reproduced: 06-10 pins both with regression tests (`application-detail.interviews.test.tsx#reopens the round dialog without the previous error`, `document-list.test.tsx#reopens the document dialog without the previous message`) |
| 4 | warning | No post-fix visual evidence beyond the README shot | Not reproduced: 06-17 Task 3 re-ran the Playwright pass on the rebuilt stack — 66 states, 0 horizontal overflow, 0 controls under 44 px, dialog animation `none` under reduced motion (`06-UAT.md` Gaps). The post-fix screenshots were not kept in the repo |
| 5 | info | 120-character document name clipped by the native select in the form CV picker at 360 px | Accepted (native control; select stays inside its section, no page overflow) |

## Top fixes

1. Optional: capture S10 through a dev-only forced-error route (finding 1).
2. Optional: keep a post-fix screenshot set next to `06-UAT.md` for the defense.
3. None blocking.

## Orchestrator verification

Findings 2-4 were checked on 2026-11-07 against `06-UAT.md` (result lines 75-105), `06-10-SUMMARY.md` (lines 47-72) and the `uat-pw` container's post-fix `results.json` (66 states, 0 overflow, 0 small targets, 0 errors). The auditor's scores are kept as returned.
