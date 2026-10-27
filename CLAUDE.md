# CLAUDE.md — Expediente (TFM Lemoncode)

Lee esto antes de cualquier tarea. Documentación de referencia en `docs/`:
`PRODUCT.md` (qué y alcance) · `DOMAIN.md` (modelo y reglas) · `ARCHITECTURE.md` (estructura y API) · `DESIGN.md` (UI) · `AI-EXTRACTION.md` (feature de IA).
Si una tarea contradice estos documentos, para y pregunta; no improvises.

## Proyecto
Tracker de candidaturas monousuario («Expediente»). Trabajo fin de curso de «Front End moderno + IA» (Lemoncode). Fecha de defensa: **9 nov 2026**. Prioridad: MVP terminado y demostrable antes que funcionalidades a medias.

## Stack (no cambiar sin ADR en `docs/decisiones.md`)
- Monorepo npm workspaces: `apps/web`, `apps/api`, `packages/contracts`. Node 22, npm 10.
- Web: React 19 + TypeScript strict + Vite, TanStack Router (rutas por archivos), TanStack Form, Zod 4, Tailwind CSS v4 + shadcn/ui, lucide-react.
- API: Hono (Node adapter) + driver oficial `mongodb` + `@aws-sdk/client-s3` + Zod 4.
- Infra local: MongoDB 8, Silo (`pgsty/minio`, fork mantenido de MinIO), Ollama.
- Tests: Vitest + Testing Library. Calidad: ESLint, Prettier, `tsc --noEmit`, pre-commit con Husky + lint-staged.

## Reglas de código
- Código, identificadores, commits y nombres de archivo en **inglés**. Textos de UI en **español** (voz del DS: tuteo, frases cortas, sin exclamaciones ni emojis).
- `packages/contracts` es la única fuente de verdad de los modelos de API (esquemas Zod + tipos inferidos). Web y API importan de `@tfm/contracts`; nunca se redefinen.
- Frontend con la arquitectura del curso (sesión 4):
  - `core/` (router, http client), `common/` (componentes genéricos), `layouts/`, `scenes/`, `pods/`.
  - Cada pod: `api/api.ts`, `<pod>.vm.ts`, `<pod>.mapper.ts`, `<pod>.hooks.ts`, `<pod>.container.tsx`, `<pod>.component.tsx`, `components/`, `index.ts` (solo exporta el container).
  - El API model viene de contracts; el view model es propio del pod y **no** deriva del API model (`extends`/`Omit` prohibidos). El mapper se aplica en el hook al recibir datos.
  - Container = datos y estado. Component = props y presentación. Las escenas componen pod + cabecera y deciden la navegación.
  - Un pod nunca importa otro pod. Rutas → escenas → pods.
- Las clases Tailwind viven junto al JSX. Solo tokens del DS (`bg-primary`, `text-status-offer`…); nada de colores hex ni `bg-blue-500`.
- API: validar toda entrada con los esquemas de contracts; respuestas de error `{ error: { code, message, details? } }`; exponer `id` (string), nunca `_id`; fechas ISO 8601 UTC.
- Sin `any`. Sin dependencias nuevas sin justificarlo en el SUMMARY del plan.
- Secretos solo en `.env` (en `.gitignore`); `.env.example` siempre actualizado.

## Comandos
```
npm install            # raíz
npm run dev            # web (5173) + api (3000) en paralelo
npm run build          # contracts → api → web
npm run test           # vitest en todos los workspaces
npm run lint           # eslint
npm run typecheck      # tsc --noEmit en todos los workspaces
npm run seed           # datos de demo en Mongo + Silo
docker compose up --build   # entregable completo en http://localhost:8080
```
Todo plan de GSD debe terminar con un `<verify>` que ejecute al menos `npm run typecheck && npm run test` y lo que sea específico de la tarea.

## Entorno
Devcontainer con servicios `mongo`, `s3` (Silo), `ollama`. Variables ya definidas en el contenedor: `MONGO_URL`, `S3_*`, `LLM_*` (ver `docs/ARCHITECTURE.md`). Usa `LLM_PROVIDER=mock` en tests.

## Git
Rama por fase (`phase/NN-nombre`), commits atómicos en Conventional Commits, una PR por fase con `/gsd-ship`. Nunca push a `main`.
