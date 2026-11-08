# Phase 7: Documentación y defensa - Pattern Map

**Mapped:** 2026-11-07
**Files analyzed:** 12 new/modified
**Analogs found:** 12 / 12 (docs: role-match; scripts: role-match; capture.mjs: no repo analog, uses RESEARCH reference)

Todos los analogs son archivos trackeados (`git ls-files` verificado para `docs/*.md`, `docs/demo/ofertas/*`, `scripts/compose-smoke.sh`). `apps/api/src/scripts/try-extract.ts` y `README.md` también son código fuente trackeado.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `docs/presentacion/deck.md` | doc (slides source) | transform (docs -> slides) | `docs/ARCHITECTURE.md` (Mermaid/estructura) + `docs/PRODUCT.md` (voz) | role-match |
| `docs/presentacion/demo-script.md` | doc (runbook) | request-response (paso a paso) | `README.md` §«Ofertas para la demo», §«Calentar el modelo», §«Si Ollama falla» | exact (contenido reutilizado) |
| `docs/presentacion/preguntas-tribunal.md` | doc (Q&A) | n/a | `docs/PRODUCT.md` (frases cortas, secciones `##`) | role-match |
| `docs/ia-en-el-proyecto.md` | doc (informe con cifras) | batch (git/.planning -> cifras) | `docs/AI-EXTRACTION.md` | role-match |
| `docs/decisiones.md` | doc (ADR log) | n/a | `docs/DOMAIN.md` / `docs/ARCHITECTURE.md` (secciones cortas con tablas) | partial |
| `README.md` (+ «Próximos pasos», enlaces) | doc (modify) | n/a | el propio `README.md` §«Documentación» (líneas 171-176) | exact |
| `docs/presentacion/capturas/*.png` | asset | file-I/O | `docs/img/application-list.png` (1280x800, DPR 1, claro) | exact |
| `docs/presentacion/capturas/capture.mjs` | script (browser, container-only) | file-I/O | no analog in repo; referencia en RESEARCH §5 | none |
| `scripts/check-docs.mjs` | script (checker) | batch | `scripts/compose-smoke.sh` (cabecera, `fail`, exit codes) + RESEARCH §7 prototipo | role-match |
| `scripts/check-figures.mjs` | script (checker) | batch | idem; consulta `git` con `child_process` | role-match |
| `docs/demo/ofertas/remote-senior.txt` | fixture (solo lectura) | n/a | existente, no se modifica | n/a |
| `apps/api/src/scripts/try-extract.ts` | referencia (no se modifica) | request-response | usado para warm-up y medición de tokens | n/a |

## Pattern Assignments

### Docs en español (`deck.md`, `demo-script.md`, `preguntas-tribunal.md`, `ia-en-el-proyecto.md`, `decisiones.md`)

**Analog de voz y estructura:** `docs/PRODUCT.md` y `docs/AI-EXTRACTION.md`.

**Convención** (`docs/PRODUCT.md` líneas 1-12): título `# Tema — Expediente`; secciones `##` cortas; frases cortas, tuteo, sin emojis ni exclamaciones; negritas puntuales.
```markdown
# Producto — Expediente

## Problema
Quien busca empleo lleva decenas de procesos a la vez: ...

## Propuesta
Una aplicación web local donde **cada candidatura es un expediente**: ...
```

**Contenido técnico con código** (`docs/AI-EXTRACTION.md` líneas 1-5, 22+): lista numerada para flujos, bloques ```ts con la ruta del archivo en el encabezado (`## Contrato (\`packages/contracts/src/offer-extraction.schema.ts\`)`). Copiar este estilo para los snippets del deck (D-04) y añadir el marcador de RESEARCH Pattern 2:
```markdown
<!-- source: apps/api/src/llm/llm.client.ts#L18-L26 -->
```

**Reglas específicas (de RESEARCH):**
- Estado inicial de una candidatura = `guardada`; el guion debe incluir «Estado inicial: Enviada» antes de añadir la ronda; el estado final es «Oferta recibida» (no «oferta»).
- El historial muestra solo fecha y no marca transiciones automáticas.
- El mock devuelve siempre «Lumen Analytics»/«Madrid».
- Cloud siempre «compatible con OpenAI»; sin Gemini/Groq; nombres de modelos OpenAI solo en la tabla de costes.
- Duraciones: 55 de 62 SUMMARY (no 56). Cut-off `c11ab61`.
- Mermaid: solo `flowchart` y `sequenceDiagram`, etiquetas entre comillas si llevan paréntesis, sin `click`.
- `docs/**` y `*.md` están excluidos de ESLint y Prettier (`eslint.config.js` líneas 7-17 `globalIgnores`, `.prettierignore`), así que tablas y Mermaid no se reformatean.

### `docs/presentacion/demo-script.md` (runbook, request-response)

**Analog:** `README.md` secciones «Calentar el modelo antes de la demo» (línea 67), «Si Ollama falla» (línea 77), «Comprobar que todo está sano» (línea 89).

**Plan B** (`README.md` líneas 77-87), reutilizar tal cual:
```bash
LLM_PROVIDER=mock docker compose up --build -d
```
«El proveedor `mock` devuelve siempre el mismo borrador de ejemplo, sea cual sea el texto que pegues.»

**Pre-flight:** enlazar `scripts/compose-smoke.sh` (uso en cabecera líneas 1-14: `bash scripts/compose-smoke.sh [--with-model] [--down] [--cold]`) y `docker compose exec app npm run seed -- --reset`.

### `README.md` (modify)

**Analog:** el propio archivo. Añadir `## Próximos pasos` antes de `## Documentación` (línea 171) y ampliar la lista de enlaces con el mismo formato (líneas 173-177):
```markdown
## Documentación

- [`docs/PRODUCT.md`](docs/PRODUCT.md): qué es y qué alcance tiene.
- [`docs/AI-EXTRACTION.md`](docs/AI-EXTRACTION.md): la extracción con IA.
```
Nuevos enlaces con el mismo formato: `docs/ia-en-el-proyecto.md`, `docs/decisiones.md`, `docs/presentacion/deck.md`, `docs/presentacion/demo-script.md`, `docs/presentacion/preguntas-tribunal.md`. Imagen README existente: línea 7 `![...](docs/img/application-list.png)`.

### `scripts/check-docs.mjs` y `scripts/check-figures.mjs` (script, batch)

**Analog 1:** `scripts/compose-smoke.sh` — cabecera con uso y propósito, `set -euo pipefail`, función `fail` con mensaje prefijado y exit 1, exit 2 por opción desconocida, `cd` al raíz del repo.
```bash
#!/usr/bin/env bash
# Compose smoke test (D-23). Usage: bash scripts/compose-smoke.sh [--with-model] [--down] [--cold]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
fail() {
  echo "SMOKE FAIL: $*" >&2
  exit 1
}
```
Traducir a Node: comentario de cabecera con uso, mensajes `CHECK FAIL: ...` / `BROKEN file:line -> target`, `process.exit(bad ? 1 : 0)`.

**Analog 2 (script a copiar):** prototipo completo en `07-RESEARCH.md` §7 (líneas 386-429). Copiar íntegro.

**Lint (obligatorio):** `eslint.config.js` aplica `globals.node` solo a `apps/*/scripts/**/*.mjs`, `*.config.{js,ts}`, etc., no a `scripts/*.mjs`. Primera línea obligatoria:
```js
/* global console, process */
```
Si el script de cifras usa más globals (p. ej. `Buffer`), añadirlos al comentario. Imports con prefijo `node:` (`node:fs`, `node:child_process`, `node:path`). Sin `any`, sin dependencias. `lint-staged` ejecuta `prettier --write` sobre `*.{ts,tsx,js,mjs,cjs}`: ejecutar `npx prettier --write scripts/check-*.mjs` antes del commit. No hay script npm todavía; llamarlo con `node scripts/check-docs.mjs` en `<verify>` (no hace falta tocar `package.json`; si se añade un script, justificarlo en el SUMMARY).

**`check-figures.mjs`:** `execFileSync("git", ["rev-list","--count","c11ab61"])`, lectura de `duration:` con `git grep -h -E '^duration:' c11ab61 -- '.planning/phases/*/*-SUMMARY.md'`; comparar con el bloque «Cifras» (`clave: valor`) de `docs/ia-en-el-proyecto.md`. Comandos y valores esperados: RESEARCH §3 (544 commits, 71 merges, 55/62 durations, 1512 min, 62 planes).

### `docs/presentacion/capturas/capture.mjs` (script, file-I/O)

**Sin analog en el repo.** Usar la referencia de RESEARCH §5 (líneas 334-352) tal cual: `chromium.launch`, `addInitScript` con `localStorage "expediente-theme"`, `waitForSelector("main")`, `page.screenshot`. Vive bajo `docs/**` (no se lint-ea). Se ejecuta en el contenedor `mcr.microsoft.com/playwright:v1.56.1-noble` con `playwright@1.56.1` pinned; no se añade al `package.json`. Receta de entorno (RESEARCH §5): `docker cp` en vez de bind mount, `docker exec -d` + log. Checkpoint humano antes de la tarea de capturas (playwright marcado SUS por `too-new`).

Convención de nombres de salida (RESEARCH): `lista-claro-1280.png`, `lista-oscuro-1280.png`, `lista-movil-360.png`; añadir `detalle-claro-1280.png`, `formulario-ia-claro-1280.png`. Viewports: 1280x800 y 360x740, DPR 1.

### Snippets verbatim para el deck (D-04)

Fuente verificada por RESEARCH §6 (releer las líneas al redactar, deben coincidir byte a byte):
- `apps/api/src/llm/llm.client.ts` L18-L26 (interfaz `LlmClient`, 9 líneas).
- `apps/web/src/pods/application-list/application-list.mapper.ts` L43-L49 (`mapStackTagsFromApiToVm`) más `application-list.vm.ts` L20-L22 (`StackTagOptionVm`).

El checker de snippets compara el bloque con `git show`/lectura del rango indicado en el marcador `<!-- source: ... -->`.

## Shared Patterns

### Voz y formato de docs
**Fuente:** `docs/PRODUCT.md`, `docs/AI-EXTRACTION.md`, `README.md`.
**Aplicar a:** todos los `.md` nuevos. Español, tuteo, frases cortas, sin exclamaciones ni emojis; nombres de archivo en inglés salvo las excepciones nombradas en CONTEXT (`ia-en-el-proyecto.md`, `decisiones.md`, `preguntas-tribunal.md`, `presentacion/`, `capturas/`).

### Enlaces internos
**Fuente:** `README.md` líneas 171-177 (`[\`ruta\`](ruta): descripción.`). **Aplicar a:** README y docs nuevos; el checker de enlaces (`scripts/check-docs.mjs`) resuelve rutas relativas y anclas con slug estilo GitHub. Los enlaces desde `docs/presentacion/*.md` a otros docs usan `../`.

### Cifras con fuente
**Fuente:** RESEARCH §3, §9. **Aplicar a:** `ia-en-el-proyecto.md`, `preguntas-tribunal.md`, `deck.md`. Cada cifra con su comando anclado en `c11ab61` o ruta `.planning/...:línea`; bloque «Cifras» legible por máquina.

### Verificación de plan
**Fuente:** `CLAUDE.md` (Comandos). **Aplicar a:** todos los planes: `<verify>` con `npm run typecheck && npm run test && node scripts/check-docs.mjs` (y `node scripts/check-figures.mjs` en el plan de la IA doc). Commits en Conventional Commits en inglés (`docs(07-NN): ...`); hooks: pre-commit = lint-staged + typecheck, pre-push = tests.

### Seguridad
**Aplicar a:** guion y capturas. Nunca pegar texto completo de oferta en logs; no commitear el vídeo plan C (D-10); sin secretos (`.env`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `docs/presentacion/capturas/capture.mjs` | script browser | file-I/O | Ningún script Playwright en el repo; usar RESEARCH §5 |
| `docs/decisiones.md` | ADR log | n/a | No existe ningún ADR previo; formato contexto/decisión/alternativas/consecuencias definido en CONTEXT D-18; fuentes en RESEARCH §8 |
| `docs/presentacion/deck.md` | slides source | transform | Sin deck previo; estructura por diapositiva (título, bullets, nota, tiempo) de CONTEXT y tabla RESEARCH (suma 15:00) |

## Metadata

**Analog search scope:** `docs/`, `scripts/`, `apps/api/src/scripts/`, `README.md`, `eslint.config.js`, `package.json`
**Files scanned:** ~12 (CONTEXT, RESEARCH 1-463, README, PRODUCT, AI-EXTRACTION, compose-smoke.sh, try-extract.ts, eslint config)
**Note:** RESEARCH.md líneas 464-713 no se leyeron; el planner debe consultarlas (Q&A evidence bank, validación) por si añaden requisitos.
**Pattern extraction date:** 2026-11-07
