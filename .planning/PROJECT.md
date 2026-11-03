# Expediente

## What This Is

Tracker de candidaturas de empleo, monousuario y local, para quien lleva muchos procesos de selección a la vez. Cada candidatura es un «expediente»: datos de la oferta, estado con historial, rondas de entrevista, etiquetas agrupadas y CV/carta vinculados. El usuario pega la descripción de una oferta y un LLM rellena el formulario y propone las etiquetas; el usuario revisa y guarda.

Es el trabajo fin de curso de «Front End moderno + IA» (Lemoncode). Defensa presencial el **9 nov 2026**. UI en español con el design system «Expediente» (pergamino, azul Oxford, burdeos, oro viejo).

## Core Value

Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero (pegar → guardar → ronda → CV → estado → filtrar) demostrable en menos de 2 minutos con `docker compose up`.

## Requirements

### Validated

- ✓ **FND**: monorepo npm workspaces, `packages/contracts`, API `/api/health` real, web con router + shell + tema + fuentes, Dockerfile y compose, calidad (lint, typecheck, test, pre-commit) — Fase 1 (FND-01..FND-10, verificado y UAT 4/4)
- ✓ **APP**: CRUD de candidaturas (crear, editar con lista blanca, borrar sin tocar documentos), listado con tarjetas y filtros/orden sincronizados con la URL, `GET /api/tags`, detalle, cambio de estado atómico con historial y `appliedAt` — Fase 2 (APP-01..APP-14, verificado 5/5, UAT 4/4, seguridad 30/30). Parciales por diseño: APP-09 (documentos → Fase 5, rondas → Fase 4) y APP-13 (`updatedAt` por rondas → Fase 4)
- ✓ **AI**: `POST /api/offers/extract` con `LlmClient` intercambiable (ollama / openai-compatible / mock), panel «Pegar oferta» que se pliega tras analizar, fusión que solo rellena campos vacíos, marcas «IA», «Complétalo tú» y etiquetas agrupadas (idiomas por campo `idiomas` aparte) — Fase 3 (AI-01..AI-09, verificado 8/8, UAT, seguridad 24/24, UI 20/24 con las 3 correcciones aplicadas en la tarea rápida 261101-qh3)

- ✓ **INT**: rondas de entrevista (crear, editar, borrar) en un diálogo del detalle, número automático (máx + 1, editable), paso atómico de `enviada` a `en_entrevistas` con historial, lista ordenada por ronda — Fase 4 (INT-01..INT-05, verificado 4/4, UAT 6/6, seguridad 0 amenazas abiertas). Avisos de revisión abiertos y no bloqueantes: candado `busy` de un solo hueco (WR-01) y aserción débil de temporizadores (WR-02)

### Active

- [ ] **DOC**: subir PDF/DOCX ≤5 MB a S3, vincular CV y carta, descargar, bloquear borrado si está en uso
- [ ] **DEMO**: seed de datos, README, responsive desde 360 px y accesibilidad AA, modo mock
- [ ] **PRES**: documentación y material de defensa (deck, guion de demo, `docs/ia-en-el-proyecto.md`, `docs/decisiones.md`, preguntas del tribunal)

### Out of Scope

- Login y multiusuario — app monousuario local; `ownerId` queda reservado y siempre `null`
- Landing pública — no aporta a la defensa
- Scraping de URLs e integraciones con portales de empleo — fuera del foco Front End + IA del TFM
- Notificaciones por correo — requiere infraestructura que el entregable local no tiene
- Despliegue en la nube — el entregable es una imagen Docker ejecutable en local
- Backlog posterior a la fase 7 (NO entra en v1): tablero Kanban con drag & drop, biblioteca de documentos con versiones y CV sugerido por IA, timeline/dashboard de métricas, e2e con Playwright

## Context

- Especificación cerrada en `CLAUDE.md` y `docs/` (`PRODUCT.md`, `DOMAIN.md`, `ARCHITECTURE.md`, `DESIGN.md`, `AI-EXTRACTION.md`). No se reabren decisiones ya tomadas ahí; si algo falta o se contradice, se pregunta.
- Entregable: imagen `tfm-app` + MongoDB 8 + Silo (`pgsty/minio`) como S3 + Ollama, todo vía `docker compose up` en `http://localhost:8080`.
- Desarrollo en devcontainer (`.devcontainer/`) con servicios `mongo`, `s3`, `ollama`. Hoja de estilos lista en `docs/design/expediente.css`.
- Frontend con la arquitectura del curso: `core/`, `common/`, `layouts/`, `scenes/`, `pods/` (API model + view model + mapper por pod). Datos con hooks propios y `fetch` + `AbortController`, sin React Query.
- Fase 1 cerrada (29 oct): esqueleto andante con monorepo, contratos Zod, API Hono con `/api/health`, shell web con tema y compose funcionando. Metodología GSD + Claude Code; rama por fase (`phase/NN-nombre`), una PR por fase.
- Fase 2 cerrada (31 oct, rama `phase/02-candidaturas`): CRUD completo de candidaturas en API y web, filtros en la URL, detalle con historial, formulario compartido crear/editar con TanStack Form; 471 tests y smoke de compose con ida y vuelta CRUD.
- Fase 4 cerrada (3 nov, rama `phase/04-rondas-entrevista`): rondas de entrevista en API y web con diálogo accesible, fechas `datetime-local` que conservan el instante guardado al editar; 870 tests y smoke de compose con ida y vuelta de rondas.

## Constraints

- **Tech stack**: React 19 + TS strict + Vite, TanStack Router/Form, Zod 4, Tailwind v4 + shadcn/ui; Hono + driver `mongodb` + AWS SDK S3 — obligatorio del curso; no cambiar sin ADR en `docs/decisiones.md`
- **Timeline**: defensa el 9 nov 2026; hoy es 28 oct, así que quedan ~12 días para 7 fases — MVP terminado y demostrable antes que funcionalidades a medias
- **Roadmap fijo**: 7 fases, una fase = una PR, con objetivos de fecha 29 oct / 31 oct / 2 nov / 3 nov / 5 nov / 7 nov / 8 nov
- **Contracts**: `packages/contracts` es la única fuente de verdad de los modelos de API; web y API nunca los redefinen
- **Calidad**: sin `any`, sin dependencias nuevas sin justificar en el SUMMARY del plan; todo plan termina con `<verify>` que ejecute al menos `npm run typecheck && npm run test`
- **IA**: debe funcionar sin conexión (Ollama local) y con `LLM_PROVIDER=mock` como plan B
- **UX**: responsive desde 360 px, usable solo con teclado, contraste AA, textos en español (tuteo, sin emojis ni exclamaciones)
- **Seguridad**: secretos solo en `.env`, `.env.example` siempre actualizado; nunca loguear el texto completo de la oferta

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo npm workspaces (`apps/web`, `apps/api`, `packages/contracts`) | Contratos Zod compartidos entre web y API sin duplicar modelos | ✓ Fase 1: web y API importan de `@tfm/contracts` |
| Hono + driver oficial `mongodb` (sin ODM) | Ligero, tipado, suficiente para dos colecciones | ✓ Fase 1: health real contra Mongo |
| Silo (`pgsty/minio`) como S3 local | Fork mantenido de MinIO, compatible con AWS SDK | ✓ Fase 1: health real contra S3 con AWS SDK |
| Estados fijos con transiciones libres e historial | Refleja procesos reales sin imponer un flujo rígido | ✓ Fase 2: PATCH de estado atómico (un `findOneAndUpdate`), idempotente para el mismo estado |
| Borrador IA nunca se persiste solo; solo rellena campos vacíos | El usuario conserva el control y revisa antes de guardar | ✓ Fase 3: la extracción no persiste nada; marcas «IA» por campo hasta que el usuario edita |
| `LlmClient` intercambiable por `LLM_PROVIDER` | Ollama local por defecto, cloud barato o mock como plan B de la demo | ✓ Fase 1: tres proveedores con tests; `gemma4:e2b` descargado en el smoke |
| Datos con hooks propios (`fetch` + `AbortController`), sin React Query | Alineado con el curso y con el alcance del MVP | ✓ Fase 2: hooks de lista, detalle y formulario con abort y respuestas obsoletas ignoradas |
| Etiquetas normalizadas en `@tfm/contracts` con `key` almacenada | Una sola normalización para servicio, filtros y agregación de `GET /api/tags` | ✓ Fase 2: datos de dev anteriores a 02-03 no tienen `key` (re-guardar o borrar); el seed de Fase 6 debe pasar por el servicio |
| Edición con lista blanca explícita en `PUT` | Estado, historial, rondas, texto de oferta y documentos solo cambian por su propio camino | ✓ Fase 2; Fase 3 añade `offerText` y Fase 5 los ids de documento a `toEditableFields` |
| Prompt de sistema literal, idéntico en código y `docs/AI-EXTRACTION.md`, con huella sha256 aprobada | Cualquier cambio de prompt o modelo pasa por el usuario; un test lo compara byte a byte | ✓ Fase 3: huella vigente `deeed808…` (tarea rápida 261101-qh3); `LLM_MODEL` sigue en gemma4:e2b |
| Idiomas hablados en un campo `idiomas` propio del modelo, con la lista cerrada `SPOKEN_LANGUAGE_WORDS` como red de seguridad | gemma4:e2b clasificaba C o Python como idioma (UAT G-03-2) y la lista cerrada degradaba «Coreano B1» (WR-01) | ✓ Fase 3: contrato público sin cambios; riesgo residual IN-02 abierto (entradas de `idiomas` sin filtrar) |
| `@tanstack/react-form` 1.33.5 fijado exacto | Mandado por el stack; única dependencia nueva de la Fase 2, aprobada en checkpoint humano | ✓ Fase 2 |
| Regla de rondas `enviada → en_entrevistas` en el servicio, evaluada en el mismo `findOneAndUpdate` (pipeline) que calcula máx + 1 | Número y cambio de estado leen el documento guardado en una sola escritura atómica | ✓ Fase 4: el repositorio no contiene literales de estado |
| `DELETE` de ronda responde 200 con la `Application` completa; `PUT` sin `round` conserva el número guardado | El cliente refresca el detalle con una sola respuesta; otros clientes no reasignan rondas por omisión | ✓ Fase 4 (D-06, D-28) |
| Feedback de mutaciones y temporizadores de éxito por candidatura en el hook del detalle | Dos candidaturas mutando a la vez no se pisan mensajes ni temporizadores | ✓ Fase 4 (fix 2ea14e0); queda el candado `busy` de un solo hueco como aviso |
| Roadmap de 7 fases fijado por el autor | MVP completo y demostrable antes que funcionalidades a medias | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-03 after Phase 4*
