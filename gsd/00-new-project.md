# Prompt para `/gsd-new-project`

Pega el bloque siguiente como respuesta a «What do you want to build?». En las preguntas de configuración responde:
- Research before planning each phase → **Sí** (luego lo desactivaremos por fase en el discuss de las fases 2, 4, 6 y 7).
- Workflow settings → valores recomendados, modo interactivo.
- Al revisar el roadmap propuesto, exige que coincida con las 7 fases de abajo antes de escribir **Approve**.

---

```
Proyecto: «Expediente», tracker de candidaturas de empleo. Trabajo fin de curso del curso
«Front End moderno + IA» de Lemoncode. Defensa presencial el 9 de noviembre de 2026.

ANTES DE NADA lee, en este orden: CLAUDE.md, docs/PRODUCT.md, docs/DOMAIN.md,
docs/ARCHITECTURE.md, docs/DESIGN.md, docs/AI-EXTRACTION.md. Son la especificación cerrada:
no reabras decisiones ya tomadas ahí; si algo falta o se contradice, pregúntame.

Resumen:
- App web monousuario, sin login, ejecutada en local con `docker compose up` (imagen tfm-app +
  MongoDB + Silo/pgsty-minio como S3 + Ollama). UI en español con el design system «Expediente».
- Cada candidatura guarda los datos de la oferta, un estado (7 fijos, transiciones libres con
  historial), varias rondas de entrevista, etiquetas agrupadas (stack / se valora / idiomas) y
  un CV y una carta vinculados (documentos en S3).
- Feature de IA en el producto: el usuario pega la descripción de una oferta y un LLM
  (Ollama local por defecto, OpenAI-compatible o mock) devuelve un borrador estructurado que
  rellena solo los campos vacíos del formulario y propone etiquetas.
- Stack obligatorio del curso en el front: React + TypeScript + Vite, TanStack Router (rutas por
  archivos), TanStack Form, Zod 4, Tailwind v4 + shadcn/ui, arquitectura core/common/layouts/
  scenes/pods con API model, view model y mapper por pod.
- API: Hono + driver oficial de MongoDB + AWS SDK S3 + Zod. Monorepo npm workspaces con
  packages/contracts compartido.
- Desarrollo en devcontainer (ya existe en .devcontainer/).

Prioridad absoluta: un MVP terminado, probado y demostrable. Mejor menos funcionalidades
completas que muchas a medias.

Requisitos v1 (agrúpalos con REQ-IDs):
- FND: monorepo, contracts, API /health, web con router + shell + tema + fuentes, Dockerfile
  y compose funcionando desde la fase 1, calidad (lint, typecheck, test, pre-commit).
- APP: CRUD de candidaturas, listado con filtros en la URL, detalle, cambio de estado con
  historial y reglas de negocio de DOMAIN.md.
- AI: extracción de oferta con LlmClient intercambiable, panel «Pegar oferta», fusión que no
  pisa datos del usuario, marcas «IA» y campos faltantes.
- INT: rondas de entrevista (crear, editar, borrar) con la regla de paso a en_entrevistas.
- DOC: subir PDF/DOCX ≤5 MB a S3, vincular CV y carta, descargar, bloquear borrado si está en uso.
- DEMO: seed de datos, README, responsive y accesibilidad AA, modo mock.
- PRES: documentación y material de defensa.

Roadmap (respétalo; una fase = una PR):
1. Fundaciones y walking skeleton (FND) — objetivo 29 oct
2. Candidaturas: listado, detalle, alta/edición manual, estado e historial (APP) — 31 oct
3. Autocompletado con IA (AI) — 2 nov
4. Rondas de entrevista (INT) — 3 nov
5. Documentos en S3 (DOC) — 5 nov
6. Pulido de demo: seed, README, responsive/a11y, tests pendientes (DEMO) — 7 nov
7. Documentación y defensa: deck, guion de demo, docs de IA y decisiones, preguntas del
   tribunal (PRES) — 8 nov

Backlog para después de la fase 7 (NO entra en v1): Kanban con drag & drop, biblioteca de
documentos con versiones y CV sugerido por IA, timeline/dashboard de métricas, e2e con Playwright.

Fuera de alcance: login/multiusuario, landing, scraping de portales, despliegue en la nube.
```
