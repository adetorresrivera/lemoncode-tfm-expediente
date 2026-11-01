# Phase 4: Rondas de entrevista - Research

**Researched:** 2026-11-01
**Domain:** MongoDB embedded-array mutations (Hono API) + Radix Dialog / TanStack Form dialog inside an existing React detail pod
**Confidence:** HIGH (every API/driver claim was executed against the real Mongo and the installed driver; every web claim was executed under the installed Vitest/jsdom)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API (decididas por el usuario al lanzar la fase)**
- **D-01:** Endpoints `POST /api/applications/:id/interviews` (201), `PUT /api/applications/:id/interviews/:interviewId` y `DELETE /api/applications/:id/interviews/:interviewId`, montados en `applications.routes.ts`. Entrada validada con `interviewInputSchema` de `@tfm/contracts` (nunca redefinido). `:id` e `:interviewId` inválidos o inexistentes → 404 `NOT_FOUND` con el cuerpo de error estándar.
- **D-02:** El id de ronda se genera con `new ObjectId().toString()` y se guarda como string (el contrato expone `id: string`).
- **D-03:** `round` = máx. actual + 1 cuando no llega en el input (1 si no hay rondas); si llega, se respeta. Editable en PUT.
- **D-04:** Regla 3 solo al **crear**: si el estado es `enviada`, pasa a `en_entrevistas` y se añade `{ status: "en_entrevistas", at: now }` a `statusHistory`. En cualquier otro estado, el estado no cambia. Editar o borrar rondas nunca cambia el estado. La regla vive en `applications.service.ts`.
- **D-05:** Operaciones atómicas sobre el array: `$push` (crear, junto con el `$set` de status, el `$push` de historial cuando aplique y `updatedAt`), `$set` con `arrayFilters` por `id` (editar), `$pull` por `id` (borrar). Toda operación actualiza `updatedAt`. Se usa `findOneAndUpdate` con `returnDocument: "after"`.
- **D-06:** Las tres operaciones responden con la **candidatura completa** actualizada (`Application`), incluido el `DELETE` (200 con cuerpo, no 204), para que la web reemplace el VM con la respuesta.

**Número de ronda**
- **D-07:** Se **permiten números repetidos** (no hay 409). Orden de la lista: `round` asc, desempate por `scheduledAt` asc (nulls al final) y después por `id`.
- **D-08:** Al borrar una ronda **no se renumeran** las demás: de 1-2-3, borrar la 2 deja 1 y 3, y la siguiente nueva será la 4.
- **D-09:** El diálogo «Añadir ronda» trae el campo «Ronda» **prerrellenado con máx. + 1**, calculado en el cliente a partir del VM, y el usuario lo puede cambiar. Si lo vacía, el campo se omite en el input y lo asigna la API (D-03).

**Fecha y zona horaria**
- **D-10:** `scheduledAt` es **opcional y siempre con hora**: un único `<input type="datetime-local">`. Vacío → `null` y la lista muestra «Sin fecha». El valor local se convierte a ISO UTC en el mapper del pod y se convierte de vuelta a local al editar.
- **D-11:** En la lista, la fecha se muestra **con hora** en la zona local del navegador: «5 nov. 2026, 10:30». Se añade `formatDateTime(iso, timeZone?)` en `apps/web/src/common/lib/format.ts`, con el mismo estilo que `formatDate` (`es-ES`, mes corto con punto) y `timeZone` opcional para que los tests sean deterministas.
- **D-12:** Las fechas pasadas no se validan: registrar rondas ya celebradas es el caso normal.

**Feedback de mutaciones**
- **D-13:** Crear y editar **esperan a la API** (sin optimismo). «Guardar ronda» muestra «Guardando…» y queda deshabilitado. Si sale bien, se cierra el diálogo y el VM se reemplaza con la respuesta (rondas, badge de estado e historial a la vez). Si falla, el diálogo sigue abierto con el error dentro y conserva lo escrito.
- **D-14:** Borrar: confirmación con el `AlertDialog` existente. Espera a la API: el botón muestra «Eliminando…» y el diálogo se cierra al terminar. Si falla, el error aparece dentro del diálogo, igual que en `delete-dialog.tsx`.
- **D-15:** Tras cada mutación se anuncia un mensaje en una región `aria-live="polite"` **propia de la sección** «Rondas de entrevista», siempre montada: «Ronda añadida.», «Ronda actualizada.» o «Ronda eliminada.». Si la creación cambió el estado, se añade « Estado cambiado a En entrevistas.». Desaparece a los 5 s, como el feedback de estado (`SUCCESS_VISIBLE_MS`).
- **D-16:** **Una mutación a la vez** en todo el detalle: un único guard de ocupado compartido por el cambio de estado y las mutaciones de ronda. Mientras hay una en vuelo, el selector de estado y los botones de ronda (añadir, editar y eliminar) se deshabilitan, para que una respuesta antigua nunca pise a una nueva. Las respuestas se escriben solo si el resultado sigue perteneciendo a la misma clave (patrón `replaceResult` del hook actual).

**Controles del diálogo**
- **D-17:** Un `Dialog` de shadcn (nuevo en `common/components/ui/dialog.tsx`, sobre `radix-ui` ya instalado, sin dependencia nueva) con un formulario TanStack Form validado con el esquema de contracts.
- **D-18:** Controles: **tipo** con `native-select` (6 opciones, cabe a 360 px); **modalidad** y **resultado** con `toggle-group` (se ven de un vistazo y se manejan con flechas); fecha con `datetime-local`, notas con `textarea` (máx. 5.000), ronda con input numérico (mín. 1).
- **D-19:** Valores por defecto al añadir: tipo **vacío** con la opción «Elige un tipo», obligatorio y con error en el campo si falta; modalidad `online`; resultado `pendiente`; ronda máx. + 1 (D-09); fecha y notas vacías. Al editar, el diálogo trae los valores de la ronda.
- **D-20:** Acciones por ronda: botones icono `ghost` siempre visibles, `Pencil` y `Trash2` de lucide, con `aria-label` «Editar ronda N» y «Eliminar ronda N». Al cerrar el diálogo, el foco vuelve al botón que lo abrió.

**Web: sección en el detalle (decididas por el usuario al lanzar la fase)**
- **D-21:** Sección «Rondas de entrevista» en el pod `application-detail`, entre Etiquetas y Notas (`docs/DESIGN.md` §detalle), con componentes `components/interview-*.tsx` (`docs/ARCHITECTURE.md`). Botón «Añadir ronda» en la cabecera de la sección.
- **D-22:** Cada ítem muestra «Ronda N · <Tipo>», la fecha formateada o «Sin fecha», la modalidad, el resultado como **badge neutro** con icono (`Clock` pendiente, `Check` superada, `X` no superada; solo tokens del DS, sin colores de estado) y las notas **plegables** (`collapsible` existente) si hay.
- **D-23:** Estado vacío: «Aún no hay rondas. Añade la primera cuando te convoquen.»
- **D-24:** El VM de ronda es propio del pod (sin `extends` ni `Omit` del API model). Lo construye `application-detail.mapper.ts` dentro de `ApplicationDetailVm`, ya ordenado (D-07), con etiquetas en español. El mapper del formulario convierte entre VM (strings, `""` = vacío) e `InterviewInput`. Las etiquetas de los enums (`INTERVIEW_TYPE_LABELS`, `INTERVIEW_MODE_LABELS`, `INTERVIEW_OUTCOME_LABELS`) se añaden a `common/lib/enum-labels.ts`.

**Tests**
- **D-25:** Service de API con Mongo real (`tfm_test`, D-11 de la fase 2): regla 3 (`enviada` → `en_entrevistas` con historial; otro estado sin cambio; editar y borrar no cambian el estado), round automático (máx. + 1, 1 si está vacío, respeta el round enviado, no se renumera tras borrar), `updatedAt` en las tres operaciones y 404 de candidatura o ronda inexistentes.
- **D-26:** Mapper de rondas: orden y desempate, etiquetas, «Sin fecha», conversión `datetime-local` ↔ ISO UTC con zona fija, y vacío → omitir `round`.
- **D-27:** Diálogo con Testing Library: prerrelleno de ronda, tipo obligatorio, envío del input correcto, error que mantiene abierto el diálogo y edición con valores cargados.

### Claude's Discretion
- Contenido exacto de los textos de error del diálogo (tono del DS: tuteo, frases cortas, sin exclamaciones).
- Si la conversión local ↔ UTC vive en `common/lib/format.ts` o en el mapper del pod.
- Extraer o no el guard compartido a un hook interno del pod.
- Si el toggle-group de modalidad o resultado necesita apilarse a 360 px.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Recordatorios y timeline de entrevistas ya figuran como DASH-01 (v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Add an interview round (type, date, mode, outcome, notes) from a dialog in the detail | `POST /interviews` via atomic pipeline update (Pattern 1); `Dialog` + TanStack Form (Patterns 4-5); `onCloseAutoFocus` pitfall (Pitfall 1) |
| INT-02 | Round number auto-assigned (max + 1) and editable | Server-side `$max` in the same pipeline (verified: empty → 1, [1,3] → 4, explicit round respected, no renumber); client prefill from VM (D-09); open question on PUT with empty round |
| INT-03 | Edit and delete a round | `findOneAndUpdate` + `arrayFilters` / `$pull` (Patterns 2-3, executed against Mongo); 404 disambiguation (Pattern 3) |
| INT-04 | Adding a round while `enviada` moves to `en_entrevistas` with history entry | Conditional `$cond` inside the same pipeline stage → race-safe, one document write; rule parameters passed from the service |
| INT-05 | Rounds listed ordered by round number with type, date, mode, outcome | Web mapper sort (`round`, `scheduledAt` nulls last, `id`), `formatDateTime`, enum labels |
| APP-13 (rounds part) | `updatedAt` changes on any round change | Every one of the three operations sets `updatedAt: now` (verified in probe); API test per operation |
</phase_requirements>

## Summary

The API side is a small, well-trodden extension of `changeStatus`: the repository already uses an aggregation-pipeline `findOneAndUpdate` with `returnDocument: "after"`, and the installed driver (`mongodb` 7.7.0) returns the document directly (or `null`), not `{ value }`. I executed the full create/edit/delete behaviour against the real Mongo (scratch collection in `tfm_test`, dropped afterwards): a **single pipeline update** can append the round, compute `round = max + 1`, move `enviada` → `en_entrevistas`, append the history entry and set `updatedAt` atomically. That is strictly better than read-then-write and needs no retry loop, so use it for create. Edit uses `$set` with `arrayFilters` (filter also contains `"interviews.id"` so a missing round yields `null`); delete uses `$pull`. `null` from `findOneAndUpdate` is ambiguous (no application vs no round); disambiguate with a follow-up `get(id)` exactly like `changeStatus` already does.

The web side has one verified trap that contradicts the UI-SPEC text: **Radix `Dialog` (and `AlertDialog`) only restores focus to its `Trigger`**. With a single controlled dialog opened from many buttons and no `Trigger`, focus falls to `<body>` on close (executed: `document.activeElement` was `BODY`). The fix is `onCloseAutoFocus` that calls `preventDefault()` and focuses a stored opener element (executed: works for button close and Esc). D-20 and the UI-SPEC "Radix returns focus" statement need this explicit handler.

Everything else is conventional: hand-write `dialog.tsx` on the unified `radix-ui` import (same as `alert-dialog.tsx`), remount the form inside `DialogContent` so each opening resets it for free, validate with `revalidateLogic` + `onDynamic` as `application-edit` does, convert `datetime-local` with `new Date("YYYY-MM-DDTHH:mm")` (local time by spec) and make tests deterministic with `vi.stubEnv("TZ", …)` (executed: works in the Vitest worker), extend the existing `application-detail` hook with a shared busy guard. Two existing detail tests will break and must be updated in the same commit (see Pitfall 6).

**Primary recommendation:** Implement create as one aggregation-pipeline `findOneAndUpdate` (every user string wrapped in `$literal`), edit as `$set` + `arrayFilters`, delete as `$pull`; return the full `Application` from all three; on the web hand-write `dialog.tsx`, handle `onCloseAutoFocus` manually, convert dates via local `Date` parsing, and test time zones with `vi.stubEnv("TZ")`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Round id generation, round numbering (max + 1), rule 3, `updatedAt` | API / Backend (service + repository) | Database (atomic pipeline update) | Business rule and atomicity must not depend on the client; the client only prefills a suggestion (D-09) |
| Input validation of a round | API / Backend (`interviewInputSchema`) | Browser (same schema for field errors) | Contracts schema is the single source; server is authoritative |
| Round ordering for display | Browser / Client (mapper) | — | Storage order is insertion order (verified); VM sorts (D-07, D-24) |
| `datetime-local` ↔ ISO UTC conversion and display time zone | Browser / Client | — | Only the browser knows the user's zone; API stores/returns UTC ISO |
| Add/edit dialog, delete confirmation, focus management | Browser / Client | — | Pure UI |
| Mutation concurrency guard (one at a time) | Browser / Client (detail hook) | Database (single-document atomicity) | Prevents stale responses from overwriting newer ones (D-16) |
| Persistence of rounds | Database (embedded `interviews` array) | — | Embedded per DOMAIN.md |

## Standard Stack

No new dependencies. Everything below is already installed. [VERIFIED: apps/api/package.json, apps/web/package.json, `node -p require(...).version`]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongodb (driver) | 7.7.0 | `findOneAndUpdate` (pipeline / operators), `ObjectId` | Mandated stack; `findOneAndUpdate` returns `WithId<T> \| null` directly by default [VERIFIED: node_modules/mongodb/mongodb.d.ts:3043-3050] |
| hono | 4.13.13 | Routes under `applications.routes.ts` | Existing |
| zod | 4.6.7 | `interviewInputSchema` (contracts) | Existing; `z.iso.datetime()` accepts `…09:30:00.000Z`, rejects `2026-11-05T10:30` and `+01:00` offsets [VERIFIED: executed] |
| radix-ui (umbrella) | 1.8.1 (`@radix-ui/react-dialog` 1.3.1) | `Dialog` primitive | Already used by `alert-dialog.tsx`; `import { Dialog } from "radix-ui"` works [VERIFIED: executed in Vitest] |
| @tanstack/react-form | 1.33.5 | Dialog form (`useForm`, `revalidateLogic`, `onDynamic`) | Same as `application-edit` |
| lucide-react | 1.57.0 | `Pencil`, `Trash2`, `Plus`, `Clock`, `Check`, `X`, `ChevronDown` | Existing |
| vitest / jsdom / Testing Library / user-event | 5.0.4 / 30.1.2 / 16.3.3 / 14.6.8 | Tests | Existing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pipeline update for create | Read-then-write with `{status: current}` filter and retry | More code, retry loop; pipeline is one atomic write and already the repo's idiom (`changeStatus`) |
| `npx shadcn add dialog` | Hand-written `dialog.tsx` modelled on `alert-dialog.tsx` | CLI (4.23.0 present) needs the registry over the network and its output must be re-adapted anyway (UI-SPEC "Dialog primitive adaptation"); hand-writing is deterministic |
| Date lib (date-fns etc.) | Native `Date` + `Intl` | Banned by "no new deps"; native is sufficient for one input type |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed in this phase. Registry check not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Browser (application-detail pod)
  InterviewsSection ── "Añadir ronda"/✎/🗑 ──► open dialog (stores opener element)
        │                                          │
        │                                  InterviewDialog (TanStack Form, strings)
        │                                          │ submit → validate (interviewInputSchema via form mapper)
        │                                          ▼
        │                              hook: createInterview/updateInterview/deleteInterview
        │                                  (busyRef guard shared with changeStatus)
        │                                          │ fetch  POST|PUT|DELETE
        ▼                                          ▼
  VM replaced with response ◄─────────── Hono routes (requireJson, parseObjectId(:id),
  (rounds + badge + history)                       interviewInputSchema.parse)
  feedback in section live region                       │
                                                        ▼
                                          applications.service (rule parameters,
                                          id generation, 404 mapping)
                                                        │
                                                        ▼
                                          applications.repository
                                          findOneAndUpdate (pipeline | arrayFilters | $pull)
                                                        │
                                                        ▼
                                          MongoDB applications.interviews[] (+ status,
                                          statusHistory, updatedAt in the same write)
                                                        │
                              null ──► service.get(id): app missing → 404 "Candidatura…"
                                                         app exists → 404 "Ronda no encontrada"
```

### Recommended Project Structure
```
apps/api/src/applications/
├── applications.repository.ts   # + addInterview / updateInterview / removeInterview
├── applications.service.ts      # + same three, rule parameters, ObjectId().toString()
├── applications.routes.ts       # + POST /:id/interviews, PUT|DELETE /:id/interviews/:interviewId
└── applications.interviews.test.ts   # NEW, real Mongo (pattern of applications.status.test.ts)
apps/web/src/common/
├── components/ui/dialog.tsx     # NEW, hand-written on radix-ui
└── lib/{format.ts,enum-labels.ts}    # + formatDateTime, local<->ISO helpers, INTERVIEW_*_LABELS
apps/web/src/pods/application-detail/
├── api/api.ts                   # + createInterview / updateInterview / deleteInterview -> Application
├── application-detail.vm.ts     # + InterviewVm, InterviewFormValues, ApplicationDetailVm.interviews
├── application-detail.mapper.ts # + sort/labels, form<->input mappers
├── application-detail.hooks.ts  # + three mutations, shared busy guard, interview feedback
└── components/interviews-section.tsx, interview-item.tsx, interview-outcome-badge.tsx,
               interview-dialog.tsx, interview-delete-dialog.tsx
```

### Pattern 1: Create = one atomic pipeline update (rule 3 + max+1 + history + updatedAt)
**What:** A single `findOneAndUpdate` with an aggregation-pipeline update. Inside one `$set` stage every expression is evaluated against the *input* document, so `status`, `statusHistory` and the new array all see the pre-update status. Executed against Mongo 8 (scratch collection in `tfm_test`, dropped):
- `enviada` + no rounds → `status: en_entrevistas`, history `[enviada, en_entrevistas@now]`, `interviews[0].round = 1`.
- rounds `[1,3]` on `guardada` → new round 4, status unchanged, history untouched.
- explicit `round: 2` respected → `[1,3,4,2]` (array keeps insertion order; no renumbering).
- document **without** an `interviews` field → handled by `$ifNull` (round 1, array created).
- unknown `_id` → `null`.
- a `notes` value of `"$interviews.round"` was stored literally thanks to `$literal`.
**When to use:** the create path only. Rule parameters (`enviada` → `en_entrevistas`) should be passed in by the service so D-04 ("the rule lives in the service") stays true while the write stays atomic.
**Example:**
```ts
// Source: executed against the devcontainer Mongo (tfm_test, scratch collection) with mongodb 7.7.0
// Every user-controlled value goes through $literal: in a pipeline a string starting with "$"
// is otherwise evaluated as a field path.
async addInterview(id, interview /* {id, round?, type, scheduledAt, mode, notes, outcome} */, rule, now) {
  const round =
    interview.round !== undefined
      ? { $literal: interview.round }
      : { $add: [{ $ifNull: [{ $max: { $ifNull: ["$interviews.round", []] } }, 0] }, 1] };
  const moves = { $eq: ["$status", rule.from] };
  return collection.findOneAndUpdate(
    { _id: id },
    [
      {
        $set: {
          interviews: {
            $concatArrays: [
              { $ifNull: ["$interviews", []] },
              [{
                id: { $literal: interview.id },
                round,
                type: { $literal: interview.type },
                scheduledAt: { $literal: interview.scheduledAt },
                mode: { $literal: interview.mode },
                notes: { $literal: interview.notes },
                outcome: { $literal: interview.outcome },
              }],
            ],
          },
          statusHistory: {
            $cond: [moves, { $concatArrays: ["$statusHistory", [{ status: { $literal: rule.to }, at: now }]] }, "$statusHistory"],
          },
          status: { $cond: [moves, { $literal: rule.to }, "$status"] },
          updatedAt: now,
        },
      },
    ],
    { returnDocument: "after" },
  );
}
```
The service tells the caller whether the status changed only implicitly (response); the web derives "Estado cambiado a En entrevistas." by comparing `vm.status` before and the response's `status` (see Pattern 6), so the API needs no extra flag.

### Pattern 2: Edit = `$set` with `arrayFilters`, whole-element replace
**What:** Filter contains `"interviews.id": interviewId` so a missing round makes the whole filter miss (`null`). Replacing the whole element (`"interviews.$[i]": {…}`) keeps PUT semantics (null clears notes/date) without per-field `$set`. Executed: updates `x2` to round 5/manager/…; unknown round id → `null`.
```ts
// Source: executed against Mongo (mongodb 7.7.0)
collection.findOneAndUpdate(
  { _id: id, "interviews.id": interviewId },
  { $set: { "interviews.$[i]": { id: interviewId, round, type, scheduledAt, mode, notes, outcome }, updatedAt: now } },
  { arrayFilters: [{ "i.id": interviewId }], returnDocument: "after" },
);
```
If `round` is absent in a PUT body see Open Question 1 (keep the stored round: build the element without overwriting `round`, e.g. `$set` of the individual `"interviews.$[i].type"` keys and omit `…round`).

### Pattern 3: Delete = `$pull` by id; disambiguating the two 404s
```ts
// Source: executed against Mongo
collection.findOneAndUpdate(
  { _id: id, "interviews.id": interviewId },
  { $pull: { interviews: { id: interviewId } }, $set: { updatedAt: now } },
  { returnDocument: "after" },
); // second delete of the same round → null (idempotent-looking requests become 404)
```
Service:
```ts
const doc = await repository.removeInterview(id, interviewId, now());
if (doc !== null) return mapApplicationDocToApi(doc);
await get(id); // throws 404 "Candidatura no encontrada" if the application is gone
throw new ApiError(404, "NOT_FOUND", "Ronda no encontrada");
```
Do **not** run `:interviewId` through `parseObjectId` (its message says "Candidatura no encontrada" [VERIFIED: apps/api/src/http/object-id.ts:7-14]); it is a plain string compared by equality and a Hono path param is always a string, so there is no operator-injection surface. Order in routes mirrors PUT: `parseObjectId(:id)` → body parse → service.

### Pattern 4: `dialog.tsx` on the unified `radix-ui` + manual focus return
`alert-dialog.tsx` imports `import { AlertDialog as AlertDialogPrimitive } from "radix-ui";` and wraps Portal+Overlay+Content [VERIFIED: apps/web/src/common/components/ui/alert-dialog.tsx:1-3,32-62]. Do the same with `Dialog as DialogPrimitive`. Because the dialog is controlled and opened from many buttons, there is no `Trigger`; store the opener on click and restore it in `onCloseAutoFocus`:
```tsx
// Source: executed under Vitest 5 / jsdom 30 with radix-ui 1.8.1 (works for the Close button and Esc)
const openerRef = useRef<HTMLElement | null>(null);
const open = (event: React.MouseEvent<HTMLElement>) => {
  openerRef.current = event.currentTarget; // do NOT rely on document.activeElement (Safari doesn't focus buttons on click)
  setState({ mode: "add" });
};
<DialogContent
  aria-describedby={undefined /* only if no DialogDescription */}
  onInteractOutside={(e) => e.preventDefault()}
  onCloseAutoFocus={(event) => {
    event.preventDefault(); // skips Radix's default (triggerRef?.focus() → nothing)
    openerRef.current?.focus();
  }}
/>
```
Radix source: modal content's default is `event.preventDefault(); context.triggerRef.current?.focus()` [VERIFIED: node_modules/@radix-ui/react-dialog/dist/index.mjs:174-176]; the same `triggerRef` logic is in alert-dialog (the existing `DeleteDialog` works only because it has an `AlertDialogTrigger`). The delete-round `AlertDialog` is also trigger-less → same handler; on success the handler should instead focus the section's «Añadir ronda» button (UI-SPEC). Guard with `isConnected` and fall back to «Añadir ronda».

### Pattern 5: Form inside the dialog (TanStack Form + contracts schema)
- Mount a child component *inside* `DialogContent` that calls `useForm({ defaultValues })`. Radix unmounts content when closed (verified: `queryByRole("dialog")` is `null` after close; `body.style.pointerEvents` returns to `""`), so "every opening resets to defaults" needs no explicit `form.reset()`.
- Reuse the `application-edit` configuration: `validationLogic: revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })`, `validators.onDynamic: ({ value }) => validateInterviewForm(value)` returning `{ fields: {...} }` [VERIFIED: apps/web/src/pods/application-edit/application-edit.hooks.ts:72-89,336-352 pattern], `onSubmitInvalid` → `requestAnimationFrame` then focus `[aria-invalid="true"]` **inside the dialog** (query the dialog node, not `document`).
- Form values are all strings (`type: ""`, `round: "3"`, `scheduledAt: ""`, `mode`, `outcome`, `notes`). Mapper to input:
```ts
const input: Record<string, unknown> = {
  type: v.type,                                   // "" → zod enum issue → «Elige un tipo de ronda.»
  scheduledAt: v.scheduledAt === "" ? null : localInputToIso(v.scheduledAt), // null if unparsable → handle as invalid
  mode: v.mode, outcome: v.outcome,
  notes: v.notes.trim() === "" ? null : v.notes,  // contract trims but keeps "" ; map blank → null here
};
if (v.round.trim() !== "") input.round = Number(v.round); // empty → key omitted (JSON.stringify drops undefined anyway)
```
- Map zod issues to fixed Spanish strings by `issue.path[0]` (as `issueToMessage` does); never echo server messages. `z.int().min(1)` flags `1.5`, `0`, `NaN`: all → «La ronda debe ser un número entero de 1 o más.» [VERIFIED: executed, `z.int().min(1).optional().safeParse(1.5).success === false`].
- Copy `FormField` and `controlProps/firstFieldError` patterns into the detail pod (a pod never imports another pod).
- Toggle groups: Radix single `ToggleGroup` renders `role="radio"` items with `aria-checked`/`data-state` [VERIFIED: executed]; the `onValueChange` handler must ignore `""` (re-click of the active item) so a value is always selected.

### Pattern 6: Detail hook — shared busy guard
Current hook: `busyRef` + `Mutation { key, pendingStatus, feedback }` state + `replaceResult` that only writes when `previous?.key === next.key`, `successTimerRef` for the 5 s clear, `.finally(() => busyRef.current = false)` [VERIFIED: application-detail.hooks.ts:60-178]. Extend, don't duplicate:
- Add React state `busy: boolean` (keyed like the rest; a ref alone cannot re-render `aria-disabled`) set where `busyRef` is set and cleared in `finally`. The status select's `aria-disabled` must become `busy || …` (today it reads `pendingStatus !== null`).
- Add `interviewFeedback: { key, message } | null` as a **separate** slot (UI-SPEC: round feedback goes only to the section region; the header status slot is not used for the automatic status change). Reuse `successTimerRef` for both so only one timer exists; clear it at the start of every mutation.
- Each round mutation returns a `Promise<void>` that rejects on failure (after releasing busy) so the dialog can show its own in-dialog error and stay open; on success it calls `replaceResult({key, outcome: "ok", vm: mapApplicationFromApiToDetailVm(application)})`, sets feedback, schedules the timer.
- «Estado cambiado a En entrevistas.»: compare `snapshot.vm.status` with `application.status` (`!==` and the new status is `en_entrevistas`) — derive from the response, never from a guess.
- Guard order, same as `changeStatus`: `if (busyRef.current || current?.outcome !== "ok") return/reject` then set the ref synchronously.

### Anti-Patterns to Avoid
- **Interpolating user strings into pipeline expressions without `$literal`:** `notes: "$offerText"` would store the offer text. Wrap every client-supplied value.
- **Relying on Radix to restore focus without a `Trigger`:** focus lands on `<body>` (see Pitfall 1).
- **Building the update from `{...input}`:** the codebase builds fields one by one on purpose (service header comments); keep that for the interview element.
- **Using `fireEvent.click` to open dialogs in tests:** it does not focus the button, so focus-return assertions are meaningless; use `userEvent` (`fireEvent` run: `activeElement` was `BODY`).
- **Sorting in the component:** the VM arrives ordered (UI-SPEC); sort once in the mapper on a copy.
- **Deriving the view model from the API model (`extends`/`Omit`):** forbidden by CLAUDE.md; declare `InterviewVm` and `InterviewFormValues` explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic append + numbering + conditional state change | Read → compute → write with retries | One pipeline `findOneAndUpdate` | Single-doc atomicity; verified edge cases (empty array, missing field) |
| Focus trap, Esc, scroll lock, `aria-modal`, portal | Custom modal | `radix-ui` `Dialog` / existing `AlertDialog` | Edge cases; already a dependency |
| Roving-arrow single-choice group | Custom radio buttons | Existing `ToggleGroup type="single"` | Arrow keys + `role=radio` for free |
| Locale-aware date formatting | Manual month names/padding | `Intl.DateTimeFormat("es-ES", …)` + the same month-dot fix as `formatDate` | Matches existing style |
| Local↔UTC conversion with offsets | Manual offset arithmetic | `new Date("YYYY-MM-DDTHH:mm")` (parsed as local time per spec) and `toISOString()` / local getters | Handles DST in the runtime zone |
| Form state/validation | Own `useState` per field | TanStack Form + contracts schema | Existing pattern |

**Key insight:** every hard part is either an atomic Mongo operator or a Radix behaviour already in the repo; the real risk is in the glue (focus return, busy guard, `$` strings in pipelines, time zone in tests).

## Runtime State Inventory

Not a rename/refactor/migration phase. Existing documents already carry `interviews: []` (`applications.repository.ts:52` comment; created `[]` by `service.create`), and the pipeline tolerates documents lacking the field (executed). No data migration, no secrets, no OS state, no build-artifact changes. Nothing found in any of the five categories — verified by reading the repository/service and the probe above.

## Common Pitfalls

### Pitfall 1: Focus is lost after closing a trigger-less Radix dialog
**What goes wrong:** closing via X/«Descartar»/Esc leaves focus on `<body>`; keyboard users restart from the top (violates D-20 and WCAG focus order).
**Why it happens:** `DialogContent` default `onCloseAutoFocus` focuses `context.triggerRef`, which is `null` without `Dialog.Trigger` [VERIFIED: react-dialog/dist/index.mjs:174-176; executed: `activeElement === BODY`]. UI-SPEC says "Radix returns focus to the element that was focused before it opened" — that is true for `FocusScope` but Radix Dialog overrides it.
**How to avoid:** `onCloseAutoFocus` → `preventDefault()` + `openerRef.current?.focus()` (executed OK incl. Esc). Store `event.currentTarget` on click. For the delete `AlertDialog` after success focus «Añadir ronda» instead.
**Warning signs:** a test asserting `expect(document.activeElement).toBe(opener)` fails with `BODY`.

### Pitfall 2: Client strings starting with `$` evaluated by the pipeline
**What goes wrong:** notes like `$title` are stored as the field's value; `$`-expressions can read other fields.
**How to avoid:** `$literal` on every client-supplied value in the create pipeline (Pattern 1; executed: `"$interviews.round"` stored verbatim). The edit/delete paths use plain update operators and are not affected. Add an API test with a `$`-prefixed note.

### Pitfall 3: Empty `notes` becomes `""` not `null`
**What goes wrong:** `notes: z.string().trim().max(5000).nullable().default(null)` [VERIFIED: packages/contracts/src/interview.schema.ts:13] trims but keeps `""`; the item would render an empty collapsible ("no notes → no trigger" per UI-SPEC).
**How to avoid:** form mapper sends `null` for blank notes; item renders notes only when `notes !== null && notes !== ""` (defence for legacy rows).

### Pitfall 4: `datetime-local` conversion and DST
**What goes wrong:** Parsing with `Date.parse` of a string with `Z`/offset, or building with `Date.UTC`, silently treats local input as UTC.
**How to avoid:** parse the control value as-is: `new Date("2026-11-05T10:30")` is local time [VERIFIED: executed, `TZ=Europe/Madrid` → `09:30Z`, `America/New_York` → `15:30Z`]. Reverse with local getters (`getFullYear()`, `getMonth()+1`, … `padStart`). Truncate seconds/ms on the way back (control step is a minute). DST edge cases executed under Europe/Madrid 2026: spring-forward gap `2026-03-29T02:30` (does not exist) resolves to `01:30Z` = local `03:30` (round trip changes the displayed value); fall-back overlap `2026-10-25T02:30` resolves to the first occurrence `00:30Z`. Test both; invalid input (`NaN` date) → treat as invalid, not as `null`.
**Deterministic tests:** `vi.stubEnv("TZ", "Europe/Madrid")` then `vi.unstubAllEnvs()` in `afterEach` [VERIFIED: executed — Date local parsing changed and restored inside the Vitest worker]. Note `src/test/setup.ts` only calls `vi.unstubAllGlobals()`, so unstub envs in the test file. The container default is UTC (`date` → `UTC`), which is what the existing `formatDate` tests implicitly rely on.

### Pitfall 5: jsdom/Radix quirks
- While a modal Dialog is open `document.body.style.pointerEvents === "none"` and returns to `""` after close [VERIFIED: executed]; `userEvent` interactions inside `DialogContent` work. Do not click outside elements while open; query inside `within(dialog)`.
- `userEvent.type` into `datetime-local` needs the complete valid string (`"2026-11-05T10:30"`) → value `"2026-11-05T10:30"`; `type=number` yields `valueAsNumber` 3 [VERIFIED: executed]. Typing partial values leaves `""`.
- Tailwind classes are not applied (`css: false`), so `aria-disabled:pointer-events-none` does not block clicks in tests: a click on an aria-disabled button reaches the handler — which must return early (assert "one request" like the existing status test at `application-detail.test.tsx:819`).
- Provide `DialogDescription` (or `aria-describedby={undefined}`) to avoid Radix console warnings; the UI-SPEC already specifies a description.
- Dialog open-state tests need `await screen.findByRole("dialog", { name })`; the title provides the accessible name.

### Pitfall 6: Two existing tests break when the section lands
- `application-detail.test.tsx:535` `"never renders interview rounds or linked documents"` asserts no heading `/ronda|entrevista/` and no button `/ronda/` [VERIFIED: read lines 535-545]. Rewrite it to keep only the documents half.
- `application-detail.test.tsx:1074-1081` expects `getAllByRole("status")` to have length 2 with `regions[1]` empty [VERIFIED: read]. The always-mounted rounds live region makes it 3. Update the count (and index assertions); `feedbackLine()` (first status region = header) is unaffected because the new region sits later in the DOM.
Because the pre-commit hook runs the suite and the project uses RED+GREEN in one commit, these edits belong in the same task that adds the section.

### Pitfall 7: Stale response / unmounted busy state
`busyRef` is released in `.finally`; if a round mutation is rejected for the dialog's benefit, release the ref *before* the rejection propagates, otherwise «Añadir ronda» stays `aria-disabled`. Also keep the `successTimerRef` cleanup in the unmount effect (already there).

### Pitfall 8: Stored `scheduledAt` format variety
`z.iso.datetime()` accepts arbitrary sub-second precision. The web sorts with `Date.parse` numbers, never string compare; optionally normalise in the service with `new Date(x).toISOString()` before storing (keeps the contract's string type; `ApplicationDoc.interviews: Interview[]` stays `string`).

## Code Examples

### `formatDateTime` (same style as `formatDate`)
```ts
// Source: executed in Node 22.23.4 (ICU): Madrid 09:30Z → "5 nov. 2026, 10:30"; 23:00Z → "6 nov. 2026, 00:00"; "5 sept. 2026, 08:05"
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    ...(timeZone ? { timeZone } : {}),
  })
    .formatToParts(new Date(iso))
    .map((p) => (p.type === "month" && !p.value.endsWith(".") ? `${p.value}.` : p.value))
    .join("");
}
```
`hour: "numeric"` would print `9:30` (verified); the CONTEXT example has two-digit hours, so use `"2-digit"` + `h23` (avoids `24:00`).

### Local ↔ UTC helpers
```ts
const pad = (n: number) => String(n).padStart(2, "0");
export const localInputToIso = (value: string): string | null => {
  const d = new Date(value);            // "YYYY-MM-DDTHH:mm" => local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
export const isoToLocalInput = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
```

### Web API client (note the DELETE differs from `deleteApplication`)
```ts
// Source: pattern of apps/web/src/pods/application-detail/api/api.ts
export const deleteInterview = (id: string, interviewId: string): Promise<Application> =>
  request(`/api/applications/${encodeURIComponent(id)}/interviews/${encodeURIComponent(interviewId)}`,
    applicationSchema, { method: "DELETE" });   // 200 with body, NOT z.undefined()
```
`request` treats any `response.ok` (so 201 too) as success and validates the body with the schema [VERIFIED: apps/web/src/core/http/http-client.ts:73-100].

### Routes
```ts
routes.post("/:id/interviews", async (c) => {
  const id = parseObjectId(c.req.param("id"));
  const input = interviewInputSchema.parse(await c.req.json());
  return c.json(await service.addInterview(id, input), 201);
});
routes.put("/:id/interviews/:interviewId", async (c) => {
  const id = parseObjectId(c.req.param("id"));
  const input = interviewInputSchema.parse(await c.req.json());
  return c.json(await service.updateInterview(id, c.req.param("interviewId"), input));
});
routes.delete("/:id/interviews/:interviewId", async (c) =>
  c.json(await service.removeInterview(parseObjectId(c.req.param("id")), c.req.param("interviewId"))));
```
`requireJson` already covers POST/PUT (and not DELETE) [VERIFIED: apps/api/src/http/require-json.ts:4-17]. ZodError → 400 `VALIDATION_ERROR` with `flattenError` via the app-level `onError` [VERIFIED: apps/api/src/app.ts error handler]. Hono 4 resolves `/:id/interviews` and `/:id/status` without conflict (different literal segment).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `findOneAndUpdate` returns `{ value }` | Returns the document or `null` (`includeResultMetadata: false` default) | driver v6+ | No `.value`; null = no match [VERIFIED: mongodb.d.ts:3043-3050] |
| Per-package `@radix-ui/react-*` | Unified `radix-ui` umbrella import | shadcn new-york | Existing `alert-dialog.tsx` already uses it |
| Date libs for `datetime-local` | Native `Date` local parsing | n/a | No dependency |

**Deprecated/outdated:** `result.value` access from `findOneAndUpdate`; `z.string().datetime()` (zod 4 uses `z.iso.datetime()`, already in the contract).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In PUT, an omitted `round` should keep the stored round (rather than re-assigning max + 1) | Pattern 2 / Open Question 1 | UI hint «Si lo vacías, se asigna la siguiente.» is shown in edit mode too; behaviour would contradict the copy |
| A2 | Normalising `scheduledAt` with `new Date(x).toISOString()` in the service is harmless | Pitfall 8 | Changes the stored string for inputs with extra sub-second digits; contract round trip still valid |
| A3 | `hour: "2-digit"` (`10:30`, `08:05`) is the intended time style | Code Examples | UI-SPEC shows only the 10:30 case; a `9:30` style would need `hour: "numeric"` |
| A4 | The 5 s `SUCCESS_VISIBLE_MS` constant is module-private in the hooks file and will be reused in place | Pattern 6 | If extracted elsewhere, import path changes only |

## Open Questions

1. **PUT with an empty «Ronda» field**
   - What we know: D-03 says round "editable en PUT"; D-09/UI-SPEC hint «Si lo vacías, se asigna la siguiente.» is shown in both modes; the schema makes `round` optional on input.
   - What's unclear: in edit mode, "assign the next" (max + 1) or "keep current"?
   - Recommendation: **keep current** on the server (simplest, never surprising) and, since the hint is always visible, either (a) accept the small copy mismatch in edit, or (b) make the edit-mode mapper substitute the round's current value when the field is emptied. Decide at plan time; if max + 1 on PUT is wanted, compute it with the same `$max` expression in a pipeline update (the `arrayFilters` form cannot express it).

2. **Where rule 3 lives (D-04 vs D-05)**
   - D-04 says the rule lives in the service; D-05 demands an atomic write. A pure service-side read-then-write is not atomic; resolved above by the service owning the rule *parameters* and the repository evaluating them in the pipeline. Confirm this reading at plan time (low risk).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MongoDB (devcontainer, `MONGO_URL=mongodb://mongo:27017/tfm`) | API integration tests | yes | 8.x (probe + 89 API tests passed) | none needed |
| Node / npm | everything | yes | v22.23.4 / 10 | — |
| Vitest | tests | yes | 5.0.4 (API `fileParallelism: false`; web jsdom) | — |
| shadcn CLI | optional `dialog` scaffold | yes (4.23.0) but needs network registry | — | Hand-write `dialog.tsx` (recommended) |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.4 — API (`environment: node`, real Mongo `tfm_test`, `fileParallelism: false`) and web (jsdom 30.1.2, Testing Library 16.3.3, user-event 14.6.8, `css: false`) |
| Config file | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` (setup `src/test/setup.ts`, `src/test/mock-fetch.ts`) |
| Quick run command | `npm run test -w @tfm/api -- src/applications` · `npm run test -w @tfm/web -- src/pods/application-detail src/common` |
| Full suite command | `npm run typecheck && npm run test && npm run lint` |

Baseline today (this session): API `src/applications` 6 files / 89 tests green; web `application-detail` + `common` 3 files / 85 tests green.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | POST creates round, 201, full Application, id string; `$`-prefixed notes stored verbatim; 400 on invalid body; 404 unknown app | API integration | `npm run test -w @tfm/api -- src/applications/applications.interviews.test.ts` | Wave 0 |
| INT-01 | Dialog submit sends the right `InterviewInput`, closes, list updates | web component | `npm run test -w @tfm/web -- src/pods/application-detail` | Wave 0 (new file) |
| INT-02 | round = max+1 / 1 if empty / explicit respected / no renumber after delete; client prefill max+1; empty → key omitted | API + mapper + dialog | same two commands | Wave 0 |
| INT-03 | PUT replaces element, null clears notes/date; DELETE `$pull`; 404 app vs 404 round (messages differ); UI edit loads values, delete confirm/error | API + web | same | Wave 0 |
| INT-04 | `enviada` → `en_entrevistas` + history entry at `now`; other statuses unchanged; PUT/DELETE never change status; UI badge+history+feedback «Estado cambiado a En entrevistas.» in one render | API + web | same | Wave 0 |
| INT-05 | Mapper order (round, scheduledAt nulls last, id), labels, «Sin fecha», `formatDateTime`; list renders type/date/mode/outcome | web unit | `npm run test -w @tfm/web -- src/pods/application-detail src/common` | Wave 0 (+ extend `format.test.ts`) |
| APP-13 | `updatedAt === now` after each of POST/PUT/DELETE | API integration | API quick command | Wave 0 |
| (tz) | `localInputToIso`/`isoToLocalInput` with `vi.stubEnv("TZ","Europe/Madrid")` incl. DST gap/overlap and NaN | web unit | web quick command | Wave 0 |
| (a11y) | focus returns to opener (add, edit via `userEvent`), after delete → «Añadir ronda»; busy guard: second click sends one request; `aria-disabled` on select and round buttons while in flight | web component | web quick command | Wave 0 |

### Sampling Rate
- **Per task commit:** the API or web quick command matching the task (pre-commit also runs the suite).
- **Per wave merge:** `npm run typecheck && npm run test && npm run lint`.
- **Phase gate:** full suite green before `/gsd-verify-work`. Manual (UI-SPEC "backstop"): native datetime picker rendering per browser, dialog at 360 px with soft keyboard.

### Wave 0 Gaps
- [ ] `apps/api/src/applications/applications.interviews.test.ts` — modelled on `applications.status.test.ts` (injected `now` clock via `tick()`, `createApp({ …allUp, db: testDb.db, now })`, `useTestDb().reset()`); covers INT-01..04, APP-13.
- [ ] `apps/web/src/pods/application-detail/application-detail.interviews.test.tsx` (or a new file beside `application-detail.test.tsx`) — mapper, dialog, hook busy guard, focus return.
- [ ] Extend `apps/web/src/common/lib/format.test.ts` — `formatDateTime`, local↔ISO helpers with `vi.stubEnv("TZ")` + `vi.unstubAllEnvs()`.
- [ ] Update existing `application-detail.test.tsx` lines ~535 and ~1079 (Pitfall 6).
- Framework install: none.

## Security Domain

`security_enforcement` is enabled in `.planning/config.json` (ASVS level 1, block on high).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (single user, no auth in MVP) | — |
| V3 Session Management | no | — |
| V4 Access Control | no (ownerId reserved, null) | — |
| V5 Input Validation | yes | `interviewInputSchema` (zod 4) on every body; `parseObjectId` for `:id`; `$literal` for pipeline values; notes rendered as a text node (`whitespace-pre-wrap`, never HTML) |
| V6 Cryptography | no | — |
| V7 Error handling / logging | yes | Existing `onError` logs only `err.message`; never log notes or the offer text (project rule) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Aggregation-expression injection via `$`-prefixed strings in a pipeline update | Tampering / Information disclosure | Wrap every client value in `$literal` (verified); keep operators fixed, never build keys from input |
| NoSQL operator injection through `:interviewId` | Tampering | Path param is a string, compared by equality; body never spread into the update |
| Mass assignment (client sets `id`, `status`, `statusHistory`) | Tampering | Build the interview element field by field; `id` generated server-side (D-02); `interviewInputSchema` has no `id`; zod strips unknown keys |
| Stored XSS via notes | Tampering | React text node, no `dangerouslySetInnerHTML` |
| Cross-site simple request creating rounds | Tampering | `requireJson` rejects non-JSON POST/PUT |
| Oversized notes | DoS | `max(5000)` in the schema (server-side), `maxLength` in the textarea |

## Project Constraints (from CLAUDE.md)

- Code, identifiers, commits, file names in **English**; UI text in **Spanish** (tuteo, short sentences, no exclamations/emojis).
- `@tfm/contracts` is the only source of truth for API models; never redefine. VM is the pod's own and **must not** derive from the API model (`extends`/`Omit` forbidden); mapper applied in the hook; container = data/state, component = props/presentation; a pod never imports another pod; scene composes.
- Pod file layout: `api/api.ts`, `<pod>.vm.ts`, `.mapper.ts`, `.hooks.ts`, `.container.tsx`, `.component.tsx`, `components/`, `index.ts` exports only the container.
- Tailwind classes live next to the JSX; DS tokens only (`bg-primary`, `text-status-offer`…), no hex or palette classes.
- API: validate all input with contracts schemas; errors `{ error: { code, message, details? } }`; expose `id` (string), never `_id`; ISO 8601 UTC dates.
- No `any`; no new dependencies without justification in the plan SUMMARY (none needed here).
- Secrets only in `.env`; keep `.env.example` current (no change in this phase); never log the full offer text.
- Every plan ends with a `<verify>` running at least `npm run typecheck && npm run test` plus task-specific commands.
- Git: branch per phase (`phase/NN-nombre`; the current checked-out branch is `phase/03-autocompletado-ia`, the roadmap names `phase/04-rondas-entrevista`), atomic Conventional Commits, one PR per phase, never push to `main`.
- GSD workflow enforcement: file-changing work goes through a GSD command.
- ESLint (flat config): `react-hooks` recommended rules (v7) and `react-refresh` apply to `apps/web` (the `ui/` folder is exempt from `only-export-components`); `@typescript-eslint/no-explicit-any` is an error; type imports must be `inline-type-imports`; `npm run lint` uses `--max-warnings=0`. `tsconfig.base` has `noUncheckedIndexedAccess` and `verbatimModuleSyntax` — indexed access and `.at()` results need narrowing.

## Sources

### Primary (HIGH confidence — executed or read this session)
- `node_modules/mongodb/mongodb.d.ts:3043-3050` and a probe script against the devcontainer Mongo (scratch collection in `tfm_test`, dropped) — pipeline create, `arrayFilters` edit, `$pull`, null results, missing `interviews` field.
- `node_modules/@radix-ui/react-dialog/dist/index.mjs:174-176,205-223` — close auto-focus default to `triggerRef`.
- Temporary Vitest/jsdom test (deleted afterwards; `git status` clean) — Dialog focus, `pointer-events`, `datetime-local`/`number` typing, toggle-group semantics, `TZ` switching and `vi.stubEnv`.
- Repository files read in full: `applications.{repository,service,routes,mapper}.ts`, `test/mongo.ts`, `http/object-id.ts`, `http/require-json.ts`, `errors.ts`, `app.ts` (handlers), `interview.schema.ts`, `enums.ts`, `error.schema.ts`, `application-detail.{hooks,vm,mapper,component,container}`, `components/{delete-dialog,status-change,offer-text-section}.tsx`, `ui/{alert-dialog,toggle-group,native-select}.tsx`, `request-status.tsx`, `format.ts`, `enum-labels.ts`, `http-client.ts`, `application-edit` hooks/mapper/form-field/field-props/tracking-section, `test/{setup,mock-fetch}.ts`, vitest configs, `eslint.config.js`, `docs/DOMAIN.md` rules.
- `04-CONTEXT.md`, `04-UI-SPEC.md`, `REQUIREMENTS.md`, `STATE.md`, `.planning/config.json`, project `CLAUDE.md` files.

### Secondary (MEDIUM confidence)
- none

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from node_modules.
- Architecture (API): HIGH — each operation executed against the real database.
- Architecture (web): HIGH for Radix/jsdom/TZ behaviours (executed); MEDIUM for the exact hook decomposition (a design choice within Claude's discretion).
- Pitfalls: HIGH — focus loss, `$literal`, DST and the two breaking tests were each observed directly.

**Research date:** 2026-11-01
**Valid until:** 2026-12-01 (stack pinned in lockfile; re-check only if `mongodb` or `radix-ui` versions change)
