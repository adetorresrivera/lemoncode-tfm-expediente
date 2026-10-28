# Expediente

## What This Is

Tracker de candidaturas de empleo, monousuario y local, para quien lleva muchos procesos de selección a la vez. Cada candidatura es un «expediente»: datos de la oferta, estado con historial, rondas de entrevista, etiquetas agrupadas y CV/carta vinculados. El usuario pega la descripción de una oferta y un LLM rellena el formulario y propone las etiquetas; el usuario revisa y guarda.

Es el trabajo fin de curso de «Front End moderno + IA» (Lemoncode). Defensa presencial el **9 nov 2026**. UI en español con el design system «Expediente» (pergamino, azul Oxford, burdeos, oro viejo).

## Core Value

Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero (pegar → guardar → ronda → CV → estado → filtrar) demostrable en menos de 2 minutos con `docker compose up`.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **FND**: monorepo npm workspaces, `packages/contracts`, API `/api/health`, web con router + shell + tema + fuentes, Dockerfile y compose funcionando desde la fase 1, calidad (lint, typecheck, test, pre-commit)
- [ ] **APP**: CRUD de candidaturas, listado con filtros sincronizados con la URL, detalle, cambio de estado con historial y reglas de negocio de `docs/DOMAIN.md`
- [ ] **AI**: extracción de oferta con `LlmClient` intercambiable (ollama / openai-compatible / mock), panel «Pegar oferta», fusión que no pisa datos del usuario, marcas «IA» y campos faltantes
- [ ] **INT**: rondas de entrevista (crear, editar, borrar) con la regla de paso automático a `en_entrevistas`
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
- Repo recién iniciado (un commit, sin código todavía). Metodología GSD + Claude Code; rama por fase (`phase/NN-nombre`), una PR por fase.

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
| Monorepo npm workspaces (`apps/web`, `apps/api`, `packages/contracts`) | Contratos Zod compartidos entre web y API sin duplicar modelos | — Pending |
| Hono + driver oficial `mongodb` (sin ODM) | Ligero, tipado, suficiente para dos colecciones | — Pending |
| Silo (`pgsty/minio`) como S3 local | Fork mantenido de MinIO, compatible con AWS SDK | — Pending |
| Estados fijos con transiciones libres e historial | Refleja procesos reales sin imponer un flujo rígido | — Pending |
| Borrador IA nunca se persiste solo; solo rellena campos vacíos | El usuario conserva el control y revisa antes de guardar | — Pending |
| `LlmClient` intercambiable por `LLM_PROVIDER` | Ollama local por defecto, cloud barato o mock como plan B de la demo | — Pending |
| Datos con hooks propios (`fetch` + `AbortController`), sin React Query | Alineado con el curso y con el alcance del MVP | — Pending |
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
*Last updated: 2026-10-28 after initialization*
