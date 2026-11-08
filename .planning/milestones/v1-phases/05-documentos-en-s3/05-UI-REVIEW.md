---
phase: "05"
slug: documentos-en-s3
audited: 2026-11-06
baseline: 05-UI-SPEC.md (approved 2026-11-04, amended 2026-11-06 for G-05-4 and G-05-4b)
overall: 19/24
screenshots: not captured (Playwright browsers not installed; code-only audit)
---

# Phase 05 — UI Review

Advisory 6-pillar audit. No implementation files modified. Visual checks at 360 px rest on UAT test 4 (pass).

## Pillar Scores

| Pillar | Score | Key finding |
|---|---|---|
| 1. Copywriting | 3/4 | Verbatim copy matches the contract; single-word visible CTAs («Descargar», «Reintentar», «Subir nuevo») remain (non-blocking, aria-labels carry the document name) |
| 2. Visuals | 3/4 | One primary per view, neutral type badge, «En uso» hook, icon-only «Eliminar» labelled; file-button pseudo-element look not screenshot-confirmed |
| 3. Color | 3/4 | Tokens only; accent within the reserved list; three new error icons use `text-destructive` against the contract |
| 4. Typography | 4/4 | Only 11/14/16/28 px and weights 400/600; version and size `font-mono tabular` |
| 5. Spacing | 3/4 | `mt-0.5` (2 px) on three icons; `file:mr-3` (12 px) conflicts with the contract's no-12 px rule (but the Archivo row prescribes it) |
| 6. Experience Design | 3/4 | Loading/empty/error/409/network/focus paths covered; dialog X enabled during upload but silently ignored |

## Top 3 Priority Fixes

1. **Error icons tinted destructive, against the contract.** `text-destructive` → `text-foreground` at `apps/web/src/pods/document-upload/components/upload-dialog.tsx:380`, `apps/web/src/pods/document-upload/components/document-picker.tsx:152`, `apps/web/src/pods/document-list/document-list.component.tsx:143`. Precedent (`application-edit/components/form-field.tsx:63`, `application-list`) uses the same tint — decide once whether precedent or the Phase 5 contract wins.
2. **Silent no-op close X during upload** (`upload-dialog.tsx:65-67`). Hide/disable the X while `uploading`, or announce «Cancela la subida para cerrar.» in the existing live region; add a one-line contract amendment.
3. **Off-scale spacing and the 12 px conflict.** `mt-0.5` → `mt-1` at the three icon sites; resolve `file:mr-3` by amending the contract (e.g. `file:mr-4` or an explicit exception).

## Detailed Findings

**Copywriting (3/4).** Spanish copy correct, tuteo, no exclamations or emojis. Checked: «Desvincúlalo antes de eliminarlo.», «Los documentos vinculados no se eliminan.» (`application-detail/components/delete-dialog.tsx:48`), «Subiendo el archivo…», «Subida cancelada.», «Documento subido.», «Documento eliminado.», empty states and the counter (`Sin documentos` / `1 documento` / `N documentos`).

**Visuals (3/4).** `/documents` header with h1 and one primary; row order per contract; detail aside with two fixed Eyebrow rows; `AlertDialogAction` uses `destructive`. Scored 3 only because the `file:` styling was not screenshot-confirmed.

**Color (3/4).** Accent limited to header «Subir documento», dialog submit, the two selected toggles and detail «Descargar». Badges neutral. Destructive icons violate «No new icon in this phase is tinted destructive»; only `RequestStatus` is exempt by inheritance.

**Typography (4/4).** `text-[11px]`, `text-sm`, `text-base`, `text-[28px]`; `font-semibold` and default only; h1 `font-serif text-[28px] font-semibold`.

**Spacing (3/4).** Cards `p-4 lg:p-6`, gaps `gap-4`/`gap-6`, touch targets `h-11`/`size-11`. Deviations: `mt-0.5` ×3; `file:mr-3` at `upload-dialog.tsx:211`. Info: footer is `flex flex-col gap-2 sm:flex-row sm:justify-end` with submit first in DOM; contract writes `flex-col-reverse` + «primary on top», which only holds with reversed DOM — visible result matches the prose.

**Experience Design (3/4).** Upload button disabled during upload with focus on «Cancelar subida»; `aria-busy` on refresh; picker keeps value on list failure; 409 keeps the dialog open; delete dialog ignores close while deleting. Gap: X and Esc ignored during upload with no feedback. Open review items WR-01 (timer test may flake) and WR-02 (idle outside-pointer case untested).

## Contract Notes

- Archivo row prescribes `file:mr-3` (12 px) while the contract bans 12 px spacing.
- Footer class string (`flex-col-reverse`) and prose («primary on top») disagree; implementation follows the prose.
- Error-icon tint: precedent vs explicit Phase 5 contract.

## Files Audited

- `.planning/phases/05-documentos-en-s3/`: `05-UI-SPEC.md`, `05-UAT.md`, `05-REVIEW.md`, `05-10-SUMMARY.md`, `05-11-SUMMARY.md`; `docs/DESIGN.md`, `CLAUDE.md`
- `apps/web/src/pods/document-upload/` (`upload-dialog.tsx`, `document-picker.tsx`, `document-upload.component.tsx`)
- `apps/web/src/pods/document-list/` (`document-list.component.tsx`, `components/document-row.tsx`, `components/document-delete-dialog.tsx`)
- `apps/web/src/pods/application-detail/` (`components/documents-section.tsx`, `application-detail.component.tsx`, `components/delete-dialog.tsx`)
- `apps/web/src/pods/application-edit/components/` (`documents-section.tsx`, `form-field.tsx`)
- `apps/web/src/scenes/document-list.scene.tsx`, `apps/web/src/layouts/app-layout.tsx`
- `apps/web/src/common/components/ui/` (`input.tsx`, `button.tsx`, `skeleton.tsx`, `alert-dialog.tsx`), `apps/web/src/common/components/request-status.tsx`
