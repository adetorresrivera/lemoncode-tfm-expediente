# Fase 1 — Fundaciones y walking skeleton

Uso: `/clear` → `/gsd-discuss-phase 1` → pega el bloque → responde a lo que pregunte con lo de abajo.
Research: **Sí** (TanStack Router file-based con Vite, Tailwind v4 + shadcn en Vite, Hono static + SPA fallback, Zod 4 `toJSONSchema`).

```
Decisiones de implementación de la fase 1 (resto en docs/ARCHITECTURE.md y CLAUDE.md):

Objetivo: al terminar, `docker compose up --build` levanta app + mongo + s3 + ollama y
http://localhost:8080 muestra el shell de Expediente con la ruta /applications vacía
(«Aún no has guardado ninguna oferta…») y /api/health responde ok con el estado de mongo,
s3 y llm. En el devcontainer, `npm run dev` levanta web (5173, proxy /api) y api (3000).

Monorepo
- npm workspaces: apps/web (@tfm/web), apps/api (@tfm/api), packages/contracts (@tfm/contracts).
- TypeScript strict con tsconfig.base.json en raíz y project references o build en orden
  contracts → api → web.
- Scripts raíz: dev (concurrently), build, test, lint, typecheck, format, seed (stub en esta fase).
- ESLint flat config + Prettier + Husky + lint-staged (lint + prettier en staged, typecheck en pre-push).
- .env.example con todas las variables de ARCHITECTURE.md. .gitignore con .env, dist, node_modules.

contracts
- Todas las enumeraciones de DOMAIN.md y los esquemas Zod de ARCHITECTURE.md desde ya
  (application, interview, tag, document, offer-extraction, error, query). Tests de esquemas.

api
- Hono con @hono/node-server. config.ts valida env con Zod y falla al arrancar si falta algo.
- Conexión Mongo con índices; storage/s3.ts con ensureBucket al arrancar; LlmClient con los tres
  providers stub (mock completo; ollama/openai pueden ser stubs con ping).
- Middleware de errores que produce { error: { code, message } }.
- En producción sirve apps/web/dist con fallback a index.html para rutas que no sean /api.
- GET /api/health → { status, mongo, s3, llm } (cada uno "ok" | "error"); 200 aunque llm falle.

web
- Vite + React 19 + TanStack Router con plugin de generación de rutas.
- Estructura completa de carpetas de ARCHITECTURE.md (pods vacíos con index.ts donde toque).
- Tailwind v4 + shadcn (base neutral); copiar docs/design/expediente.css a src/styles.css;
  fuentes con @fontsource-variable (eb-garamond, source-sans-3, jetbrains-mono).
- core/http/http-client.ts tipado; core/theme con sistema/claro/oscuro en localStorage con try/catch.
- layouts/app-layout.tsx: sidebar escritorio + Sheet en móvil + toggle de tema, según DESIGN.md.
- Ruta / redirige a /applications; /applications muestra el estado vacío.
- common/lib/format.ts con formatDate («12 oct. 2026») y formatMoney («52.000 €») + tests.

Docker
- Dockerfile multi-stage (deps → build → runtime node:22-slim, usuario node, HEALTHCHECK).
- compose.yml raíz: app, mongo:8, s3 (pgsty/minio, consola 9001), s3-init (pgsty/mc crea
  tfm-assets), ollama + ollama-init (pull de LLM_MODEL). Healthchecks y depends_on con
  condition: service_healthy. Versiones de imagen fijadas.
- README mínimo con cómo arrancar (se completa en la fase 6).

Verificación de la fase: npm run typecheck && npm run lint && npm run test && npm run build
y docker compose up --build con curl a /api/health.
```
