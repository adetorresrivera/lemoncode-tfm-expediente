# Phase 4: Rondas de entrevista - Pattern Map

**Mapped:** 2026-11-01
**Files analyzed:** 22 (new + modified)
**Analogs found:** 21 / 22 (all analogs are git-tracked source under `apps/` and `packages/`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `apps/api/src/applications/applications.repository.ts` (+addInterview/updateInterview/removeInterview) | repository | CRUD (atomic update) | same file, `changeStatus` / `updateEditable` (L121-181) | exact |
| `apps/api/src/applications/applications.service.ts` (+3 methods) | service | CRUD | same file, `changeStatus` + `update` (L117-134) | exact |
| `apps/api/src/applications/applications.routes.ts` (+3 routes) | route | request-response | same file, `PUT /:id`, `PATCH /:id/status` (L35-45) | exact |
| `apps/api/src/applications/applications.interviews.test.ts` (NEW) | test | request-response, real Mongo | `applications.status.test.ts` | exact |
| `apps/web/src/common/components/ui/dialog.tsx` (NEW) | component (ui) | event-driven | `ui/alert-dialog.tsx` | exact |
| `apps/web/src/common/lib/format.ts` (+formatDateTime, localInputToIso, isoToLocalInput) | utility | transform | same file `formatDate` L1-15 | exact |
| `apps/web/src/common/lib/format.test.ts` (extend) | test | transform | existing `formatDate` tests in same file | exact |
| `apps/web/src/common/lib/enum-labels.ts` (+INTERVIEW_*_LABELS) | config | transform | same file `WORK_MODE_LABELS` | exact |
| `pods/application-detail/api/api.ts` (+3 calls) | api client | request-response | same file `patchApplicationStatus` | exact |
| `pods/application-detail/application-detail.vm.ts` (+InterviewVm, InterviewFormValues) | model | transform | same file `DetailHistoryEntryVm` | exact |
| `pods/application-detail/application-detail.mapper.ts` (+sort/labels, form<->input) | mapper | transform | same file `mapApplicationFromApiToDetailVm`; form mapper: `application-edit.mapper.ts` `issueToMessage`/`validateApplicationForm` L275-352 | exact |
| `pods/application-detail/application-detail.hooks.ts` (+3 mutations, shared busy) | hook | request-response | same file `changeStatus` L116-175 | exact |
| `pods/application-detail/application-detail.container.tsx` / `.component.tsx` (wire props, section) | container / component | request-response | same files | exact |
| `components/interviews-section.tsx` | component | request-response | `components/offer-text-section.tsx` (section shell) + `status-change.tsx` (live region) | role-match |
| `components/interview-item.tsx` | component | transform | `offer-text-section.tsx` (Collapsible) | role-match |
| `components/interview-outcome-badge.tsx` | component | transform | `common/components/status-badge.tsx` (not read; same role) | role-match |
| `components/interview-dialog.tsx` | component | request-response (form) | `application-edit/components/tracking-section.tsx` + `form-field.tsx` + `application-edit.hooks.ts` L60-130 | role-match |
| `components/interview-delete-dialog.tsx` | component | request-response | `components/delete-dialog.tsx` | exact (but trigger-less, see below) |
| `components/interview-form-field.tsx` / `field-props.ts` (copies into the pod) | component / utility | transform | `application-edit/components/form-field.tsx`, `field-props.ts` | exact (copy; a pod never imports another pod) |
| `application-detail.test.tsx` (update ~L535, ~L1074-1081) + new interviews test | test | request-response | `application-detail.test.tsx` (status test L819) | exact |

## Pattern Assignments

### `applications.repository.ts` (repository, atomic CRUD)

**Analog:** same file. Add the three methods to the `ApplicationsRepository` interface (L79-99, comment style: "Null when ...") and the factory (L106+). `ApplicationDoc.interviews: Interview[]` (L52) already exists; update its comment (says "always [] in Phase 2").

**Pipeline update pattern** (L121-154) to copy for create:
```ts
async changeStatus(id, status, now) {
  return collection.findOneAndUpdate(
    { _id: id, status: { $ne: status } },
    [{ $set: {
        status: { $literal: status },
        statusHistory: { $concatArrays: ["$statusHistory", [{ status: { $literal: status }, at: now }]] },
        updatedAt: now,
    } }],
    { returnDocument: "after" },
  );
},
```
For `addInterview` use RESEARCH Pattern 1 verbatim (`$concatArrays` + `$ifNull`, `$cond` on `{ $eq: ["$status", rule.from] }`, every client value in `$literal`).

**Explicit field-by-field set** (L157-181, `updateEditable`): never build from request. For edit use RESEARCH Pattern 2 (`arrayFilters`, filter `"interviews.id"`); for delete Pattern 3 (`$pull` + `$set updatedAt`). All return `findOneAndUpdate(..., { returnDocument: "after" })` (null on miss; no upsert).

### `applications.service.ts` (service)

**Analog:** same file L57-134.
```ts
async function get(id: ObjectId): Promise<Application> {   // L61-67, reuse for 404 disambiguation
  const doc = await repository.findById(id);
  if (doc === null) throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
  return mapApplicationDocToApi(doc);
}
async changeStatus(id, status) {                            // L129-134
  const doc = await repository.changeStatus(id, status, now());
  if (doc !== null) return mapApplicationDocToApi(doc);
  return get(id);
},
```
New methods: `now()` injected clock, `new ObjectId().toString()` for the id (import `ObjectId` as value; currently `import type`), build the interview element field by field (header comment L30-34 and L79-80 explain why), pass rule `{ from: "enviada", to: "en_entrevistas" }` to the repository. On `null`: `await get(id)` (throws app 404) then `throw new ApiError(404, "NOT_FOUND", "Ronda no encontrada")`. `mapApplicationDocToApi` already copies `interviews: doc.interviews` (mapper L30).

### `applications.routes.ts` (route)

**Analog:** same file L35-45.
```ts
routes.put("/:id", async (c) => {
  const id = parseObjectId(c.req.param("id"));
  const input = applicationInputSchema.parse(await c.req.json());
  return c.json(await service.update(id, input));
});
```
Add the three routes from RESEARCH "Routes" (POST returns `c.json(..., 201)`; DELETE returns 200 body, not `c.body(null, 204)` as L47-50). Import `interviewInputSchema` from `@tfm/contracts` (import block L1-5). No try/catch (L12 comment). `:interviewId` is NOT passed to `parseObjectId`.

### `applications.interviews.test.ts` (test, real Mongo)

**Analog:** `applications.status.test.ts` L1-100: copy the header wholesale (imports L1-15, `allUp` deps, `JSON_HEADERS`, injected `clock`/`tick`, `buildApp()` with `createApp({ ...allUp, db: testDb.db, now: () => clock })`, `create`/`get` helpers, `beforeAll useTestDb`, `beforeEach reset + tick + spy console.error`, `afterAll close`). Assertions style: `applicationSchema.parse(await res.json())`, `updatedAt` equals `tick` instant (L87-99). Add a `$`-prefixed `notes` test (RESEARCH Pitfall 2).

### `common/components/ui/dialog.tsx` (NEW, ui)

**Analog:** `ui/alert-dialog.tsx`.
Imports L1-3: `import * as React from "react"; import { AlertDialog as AlertDialogPrimitive } from "radix-ui"; import { cn } from "@/common/lib/utils";` -> use `Dialog as DialogPrimitive`.
Content wrapper (L113-133): `Portal` > `Overlay` + `Content` with `data-slot`, `cn(...)` classes; Title (L135-149, `font-serif text-base font-semibold leading-[1.2] text-foreground`), Description (L151-162), Footer (L164-178). Copy these classes (overlay `bg-sidebar/70`, DS tokens only). Export block at L210-219. Add `onCloseAutoFocus` handling in the consumer (RESEARCH Pattern 4): `event.preventDefault(); openerRef.current?.focus()`; stored from `event.currentTarget` on click. Note `ui/` is exempt from `only-export-components`.

### `format.ts` (+ formatDateTime)

**Analog:** `formatDate` L1-15 (copy structure; RESEARCH "formatDateTime" adds `hour: "2-digit", minute: "2-digit", hourCycle: "h23"` and keeps the month-dot `formatToParts` map). Add `localInputToIso` / `isoToLocalInput` (RESEARCH "Local <-> UTC helpers"). Tests: extend `format.test.ts` with `vi.stubEnv("TZ", "Europe/Madrid")` + `vi.unstubAllEnvs()` in `afterEach`.

### `enum-labels.ts`

**Analog:** same file L18-23 `Record<Enum, string>` pattern with `import type {...} from "@tfm/contracts"` (extend the import with `InterviewType`, `InterviewMode`, `InterviewOutcome`; check exact exported type names in `packages/contracts/src/enums.ts`).

### `api/api.ts` (web client)

**Analog:** `patchApplicationStatus` (L227-236):
```ts
request(`/api/applications/${encodeURIComponent(id)}/status`, applicationSchema, { method: "PATCH", body: { status } });
```
Add create (POST, body `InterviewInput`), update (PUT) and delete (DELETE with `applicationSchema`, NOT `z.undefined()` as `deleteApplication` L221-225). Encode both ids.

### `application-detail.vm.ts` / `.mapper.ts`

**VM analog:** `DetailHistoryEntryVm` (vm L115-118) and `ApplicationDetailVm` (L120-136): declare `InterviewVm` (id, round, typeLabel, type, dateLabel `string|null`, scheduledAtLocal, modeLabel, mode, outcome, outcomeLabel, notes) and `InterviewFormValues` (all strings) explicitly; no `extends`/`Omit`. Add `interviews: InterviewVm[]` to `ApplicationDetailVm`.

**Mapper analog:** `mapApplicationFromApiToDetailVm` (mapper L60-89): add `interviews: sortInterviews(application.interviews).map(...)` inside the returned object (sort on a copy: round asc, `Date.parse(scheduledAt)` asc nulls last, id). Labels import pattern at mapper L2-7. Form mapper -> `InterviewInput` per RESEARCH Pattern 5; zod issue -> fixed Spanish message by `issue.path[0]`, model on `issueToMessage` + `validateApplicationForm` (`application-edit.mapper.ts` L275-352, `safeParse(..., { reportInput: true })`, returns `{ fields }`).

### `application-detail.hooks.ts`

**Analog:** same file L58-175. Reuse: keyed `Result` (L21-26), `busyRef` (L69), `replaceResult` (L112-114), guard `if (busyRef.current || current?.outcome !== "ok") return` (L119), timer clear (L122-125), `SUCCESS_VISIBLE_MS` timer (L155-162), `.finally(() => { busyRef.current = false })` (L172). New: `busy` React state alongside the ref (so `aria-disabled` renders), separate `interviewFeedback` slot, round mutations return `Promise<void>` that rejects after releasing busy (RESEARCH Pattern 6, Pitfall 7). Status change in the success message: compare `snapshot.vm.status` vs `application.status`. Note `StatusChange` currently uses `pending` prop (`aria-disabled={pending}`, status-change.tsx L33-34): feed it `busy`.

### `components/interviews-section.tsx`, `interview-item.tsx`

**Analog:** `offer-text-section.tsx` L79-112 for the section shell and Collapsible:
```tsx
<section aria-labelledby="offer-text-heading" className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 lg:p-6">
  <h2 id="offer-text-heading" className="font-serif text-base font-semibold leading-[1.2]">...</h2>
  <Collapsible open={open} onOpenChange={setOpen}>
    <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="h-11 w-full justify-between px-4">...<ChevronDown .../>
    <CollapsibleContent className="pt-4"><p className="whitespace-pre-wrap break-words text-base">
```
Live region: copy `status-change.tsx` L49-57 (`role="status" aria-live="polite"`, always mounted, `RequestStatus` inside). Component order in `application-detail.component.tsx` L139-142: insert `<InterviewsSection .../>` between `TagsSection` (L140) and `NotesSection` (L141). Props flow container -> component as in Props L27-41. Icon buttons `Pencil`/`Trash2` already imported pattern in component L2 and `delete-dialog.tsx` L1.

### `components/interview-delete-dialog.tsx`

**Analog:** `delete-dialog.tsx` L24-75: copy `handleOpenChange` guard (ignore close while deleting, L31-34), `onOverlayClick`, `event.preventDefault(); if (!deleting) onConfirm()` on the action (L64-67), the in-dialog `role="status"` + `RequestStatus kind="error"` (L50-57), `aria-disabled` on both buttons, «Eliminando…» label. Difference: no `AlertDialogTrigger` (many rows) -> controlled from the section, plus `onCloseAutoFocus` on `AlertDialogContent` (pass-through props) to refocus opener; after success focus «Añadir ronda».

### `components/interview-dialog.tsx` (form)

**Analogs:** `application-edit/components/tracking-section.tsx` L42-68 (`form.Field` + `FormField` + `controlProps` + `NativeSelect`), L78-99 (`Input` with `type="date"` -> `datetime-local`); `form-field.tsx` L135-183; `field-props.ts` L196-231 (`firstFieldError`, `controlProps`); `application-edit.hooks.ts` L72-89 (`useForm`, `revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })`, `validators.onDynamic`) and L123-126 (`onSubmitInvalid` -> focus first `[aria-invalid="true"]`; scope the query to the dialog node, not `document`, L43). Toggle groups: use existing `ui/toggle-group.tsx` (`type="single"`, ignore `""` in `onValueChange`). Mount the form component inside `DialogContent` so each open resets. Copy `FormField`, `controlProps`, `firstFieldError` into the pod (`components/`), do not import from `application-edit`.

## Shared Patterns

### Error response and 404
`ApiError(404, "NOT_FOUND", msg)` thrown from service (service L63-66); routes have no try/catch; `onError` in `app.ts` shapes `{ error: { code, message, details? } }`. Apply to all three new service methods.

### Atomic single-document write, no upsert, `updatedAt: now`
Source: repository L125-181. Apply to create/edit/delete (APP-13).

### Never spread request data
Source: service L30-34, L79-80; repository L155. Apply to the interview element in create and edit.

### Busy guard + keyed result
Source: hooks L69, L112-119, L172. Apply to all round mutations and the status change.

### Fixed Spanish UI messages (never echo server text)
Source: hooks L36-37 (`STATUS_ERROR_MESSAGE`), `delete-dialog.tsx` L53-54. Apply to dialog errors.

### Tests: Testing Library + mock fetch
Source: `application-detail.test.tsx` (status test at ~L819 asserts one request when aria-disabled; update tests at ~L535 and ~L1074-1081 per RESEARCH Pitfall 6). Use `userEvent`, not `fireEvent`, for focus assertions.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Trigger-less Radix dialog opener/focus-return handling | component behaviour | event-driven | Existing dialogs use `Trigger`; use RESEARCH Pattern 4 |

(`interview-outcome-badge.tsx` has a role-match in `common/components/status-badge.tsx`, not read here; planner should read it before writing. The `interviewInputSchema` shape is in `packages/contracts/src/interview.schema.ts`.)

## Metadata

**Analog search scope:** `apps/api/src/applications`, `apps/web/src/pods/application-detail`, `application-edit`, `common/components/ui`, `common/lib`, `packages/contracts/src`
**Files scanned:** ~15 read in full or in part; all listed analogs come from `git ls-files` output (tracked)
**Pattern extraction date:** 2026-11-01
