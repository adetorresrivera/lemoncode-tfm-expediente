# Decisiones — Expediente

Este es el registro canónico de decisiones del proyecto. `CLAUDE.md` exige que cualquier cambio de stack pase por aquí antes de tocar código. Cada decisión (ADR) tiene contexto, decisión, alternativas y consecuencias, y enlaza las fuentes donde quedó anotada.

Las doce decisiones siguen el orden en que un tribunal suele preguntarlas: primero la estructura del código, luego los datos y la infraestructura, y al final las reglas propias de la IA y de los documentos.

## ADR-001: Monorepo con npm workspaces y contratos en `@tfm/contracts`

### Contexto

La web y la API comparten los mismos modelos: candidatura, ronda, etiqueta, documento y el borrador de la IA. Duplicarlos en dos paquetes acaba en desajustes que solo se ven en ejecución.

### Decisión

Un monorepo con npm workspaces: `apps/web`, `apps/api` y `packages/contracts` (`@tfm/contracts`). Los modelos de la API son esquemas Zod 4 con sus tipos inferidos y viven solo en `packages/contracts`. La web y la API importan de ahí y nunca los redefinen.

### Alternativas

- Dos repositorios: obligan a publicar el paquete de contratos o a copiarlo.
- Tipos escritos a mano en cada lado: la validación y el tipo pueden divergir sin que nada falle.
- Un único paquete con web y API juntas: mezcla dependencias de navegador y de servidor.

### Consecuencias

- Un cambio de contrato rompe el `typecheck` de web y API a la vez, antes de llegar al navegador.
- La API valida las entradas con los mismos esquemas que usa el formulario.
- Cuesta un paso de build más: `npm run build` compila contratos, luego API, luego web.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [reglas de código](../CLAUDE.md), [Fase 1, D-01](../.planning/phases/01-fundaciones-y-walking-skeleton/01-CONTEXT.md), [arquitectura](ARCHITECTURE.md).

## ADR-002: Arquitectura de pods del curso

### Contexto

El curso de Front End moderno propone una estructura por capas y pods. El proyecto es un trabajo del curso y tiene que poder leerse con ese mismo criterio.

### Decisión

El frontend se organiza en `core/`, `common/`, `layouts/`, `scenes/` y `pods/`. Cada pod tiene `api`, view model, mapper, hooks, container, component e `index.ts` que solo exporta el container. El view model es propio del pod y no deriva del modelo de la API: `extends` y `Omit` están prohibidos. Un pod nunca importa otro pod; las escenas componen pods y deciden la navegación.

### Alternativas

- Carpetas por tipo (`components/`, `hooks/`, `services/`): mezcla pantallas distintas y crece sin frontera clara.
- Usar los tipos de la API directamente en los componentes: cualquier cambio de contrato llega a la presentación.

### Consecuencias

- Cada pod se entiende y se prueba por separado.
- El mapper es el único punto donde cambian los nombres y los formatos entre API y pantalla.
- Hay más archivos por funcionalidad y algo de código de traducción.

Fuentes: [reglas de código](../CLAUDE.md), [Fase 1, D-14](../.planning/phases/01-fundaciones-y-walking-skeleton/01-CONTEXT.md), [Fase 2](../.planning/phases/02-candidaturas/02-CONTEXT.md), [arquitectura](ARCHITECTURE.md).

## ADR-003: Hono con el driver oficial de MongoDB

### Contexto

La API tiene dos colecciones y unas pocas rutas. No hace falta un framework con inyección de dependencias ni una capa de mapeo de objetos.

### Decisión

Hono con el adaptador de Node y el driver oficial `mongodb`, sin ODM. Los errores salen siempre como `{ error: { code, message, details? } }` y los documentos se exponen con `id` como string, nunca `_id`.

### Alternativas

- Express: más antiguo y sin tipado propio de rutas.
- NestJS: demasiada ceremonia para dos colecciones.
- Mongoose: añade un segundo esquema que duplicaría el de `@tfm/contracts`.

### Consecuencias

- La API es pequeña y legible de arriba abajo.
- Los repositorios convierten `_id` en `id` a mano.
- Las operaciones atómicas, como el cambio de estado, se escriben directamente con `findOneAndUpdate`.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [stack](../CLAUDE.md), [arquitectura](ARCHITECTURE.md).

## ADR-004: Aplicación monousuario y local

### Contexto

Expediente lo usa una sola persona en su propio equipo. Añadir registro, sesiones y permisos multiplicaría el trabajo sin aportar al caso de uso del trabajo de fin de curso.

### Decisión

Sin registro ni login. El modelo reserva `ownerId`, que vale siempre `null`, para poder añadir usuarios más adelante sin migrar la forma de los datos. Los puertos publicados por Compose se enlazan a `127.0.0.1`.

### Alternativas

- Login con sesiones o JWT: fuera del alcance del MVP y del plazo.
- Sin ningún campo reservado: obligaría a migrar todos los documentos el día que haya más de un usuario.

### Consecuencias

- Cualquiera con acceso a la máquina ve los datos; no se expone nada a la red.
- Pasar a multiusuario exige autenticación y filtrar cada consulta por `ownerId`.

Fuentes: [Out of Scope](../.planning/REQUIREMENTS.md), [Out of Scope del proyecto](../.planning/PROJECT.md), [dominio](DOMAIN.md), [compose](../compose.yml).

## ADR-005: Silo como S3 local tras el fin de MinIO CE

### Contexto

La aplicación guarda CV y cartas en un almacén compatible con S3. MinIO Community Edition entró en modo de mantenimiento el 2025-12-03 y su repositorio quedó archivado el 2026-02-12 ([vonng.com](https://vonng.com/en/db/minio-resurrect/), consultado el 2026-11-07). El código habla S3 mediante el SDK de AWS, así que necesita un servidor local que lo entienda.

### Decisión

Silo (`pgsty/minio`): fork mantenido de MinIO, compatible con el SDK de AWS. La imagen está fijada en `compose.yml` como `pgsty/minio:RELEASE.2026-08-04T00-00-00Z`. Este registro no añade más razones de las que quedaron anotadas.

### Alternativas

- SeaweedFS, RustFS (Apache 2.0) y Garage (AGPLv3): alternativas compatibles con S3 que cita la prensa técnica ([InfoQ](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives/), consultado el 2026-11-07). No se probaron en este proyecto.
- La última imagen de MinIO CE sin mantenimiento: dejaría de recibir correcciones de seguridad.

### Consecuencias

- Cambiar de servidor solo toca las variables `S3_*`, porque el código usa `@aws-sdk/client-s3`.
- El proyecto depende de un fork de terceros con licencia AGPL.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [stack](../CLAUDE.md), [imágenes fijadas](../compose.yml), [arquitectura](ARCHITECTURE.md).

## ADR-006: Ollama local con proveedor intercambiable

### Contexto

La función de IA tiene que funcionar sin conexión durante la defensa y no puede depender de una clave de pago. A la vez, hace falta un plan B si el modelo local va lento.

### Decisión

Un `LlmClient` con tres proveedores elegidos por `LLM_PROVIDER`: `ollama` (por defecto, con `gemma4:e2b`), `openai` (cualquier endpoint compatible con OpenAI) y `mock` (una respuesta fija tras 300 ms). Se usa `fetch` nativo, sin SDK de ningún proveedor.

### Alternativas

- Solo un servicio en la nube: exige red y clave durante la demo.
- Un SDK por proveedor: añade dependencias y no aporta nada a una sola llamada HTTP.

### Consecuencias

- El coste del modelo local es la latencia: en CPU tarda de decenas de segundos a más de un minuto según la oferta.
- Cambiar de modelo o de proveedor es cuestión de variables de entorno.
- El proveedor `mock` hace deterministas los tests y la demo de reserva.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [Fase 3, D-01](../.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md), [extracción con IA](AI-EXTRACTION.md), [README](../README.md).

## ADR-007: Una imagen y Docker Compose

### Contexto

El entregable se ejecuta en cualquier equipo con `docker compose up`, sin instalar Node, Mongo ni un servidor S3 a mano.

### Decisión

Una sola imagen `tfm-app` sirve la API y la web compilada, y `compose.yml` levanta los servicios `app`, `mongo`, `s3`, `s3-init`, `ollama` y `ollama-init`. Las versiones de las imágenes están fijadas y `OLLAMA_KEEP_ALIVE: "30m"` mantiene el modelo cargado entre análisis.

### Alternativas

- Una imagen para la web y otra para la API: duplica el build y obliga a configurar CORS.
- Instalación manual de cada servicio: es lo que se quiere evitar.

### Consecuencias

- Un solo comando levanta todo, con healthchecks y `depends_on` por salud.
- La primera descarga del modelo pesa varios GB.
- Hay que actualizar a mano las versiones fijadas.

Fuentes: [Fase 1, D-21](../.planning/phases/01-fundaciones-y-walking-skeleton/01-CONTEXT.md), [Fase 6, D-26](../.planning/phases/06-pulido-de-demo/06-CONTEXT.md), [compose](../compose.yml), [arquitectura](ARCHITECTURE.md).

## ADR-008: shadcn/ui con el design system Expediente

### Contexto

El design system «Expediente» ya define los tokens de color, tipografía y radio. shadcn/ui genera sus propios tokens al inicializarse.

### Decisión

Se inicializa shadcn/ui con el color base `neutral` y no se regeneran los tokens: la hoja `docs/design/expediente.css` se copia a la hoja de estilos de la web. En las clases solo se usan tokens del design system.

### Alternativas

- Dejar que shadcn regenere los tokens: perdería el pergamino, el azul Oxford y el burdeos.
- Escribir los componentes desde cero: más trabajo y peor accesibilidad de base.

### Consecuencias

- Los componentes de shadcn heredan la identidad visual sin tocarlos.
- Los colores hexadecimales y las clases como `bg-blue-500` quedan prohibidos.

Fuentes: [diseño](DESIGN.md), [Fase 1, D-15](../.planning/phases/01-fundaciones-y-walking-skeleton/01-CONTEXT.md), [reglas de código](../CLAUDE.md).

## ADR-009: Hooks de datos propios, sin React Query

### Contexto

El curso enseña a escribir los hooks de datos con `fetch`. El MVP tiene una lista, un detalle y un formulario, sin caché compartida entre pantallas.

### Decisión

Hooks propios con `fetch` y `AbortController`. Cuando llega una respuesta obsoleta se ignora: gana siempre la última petición.

### Alternativas

- React Query: resuelve caché e invalidación, pero añade una dependencia y una capa que el MVP no necesita.
- SWR: mismo argumento.

### Consecuencias

- Menos dependencias y un flujo de datos que se explica en una pantalla.
- La caché y la invalidación se escriben a mano cuando hacen falta.
- React Query es el paso siguiente si llegan caché compartida o varios usuarios.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [Out of Scope](../.planning/REQUIREMENTS.md), [arquitectura](ARCHITECTURE.md).

## ADR-010: El borrador de la IA nunca se guarda solo

### Contexto

Un modelo pequeño puede equivocarse. Si guardara el resultado por su cuenta, el usuario perdería el control de lo que queda en su expediente.

### Decisión

`POST /api/offers/extract` no guarda nada: devuelve un borrador. El borrador solo rellena campos vacíos del formulario y cada campo rellenado lleva la marca «IA» hasta que el usuario lo edita. Un segundo análisis sustituye los campos que siguen marcados (tarea rápida 261101-gpz). Las marcas son estado de sesión y no se persisten.

### Alternativas

- Guardar el borrador directamente: rápido, pero sin revisión humana.
- Sobrescribir todos los campos en cada análisis: borraría lo que el usuario ya corrigió.

### Consecuencias

- El usuario revisa y decide antes de guardar.
- Persistir las marcas más adelante cambiaría el contrato de `@tfm/contracts` y la API, así que sería un cambio costoso.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [Fase 3](../.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md), [tarea rápida 261101-gpz](../.planning/quick/261101-gpz-fix-re-analysis-merge-replace-fields-sti/261101-gpz-PLAN.md), [extracción con IA](AI-EXTRACTION.md).

## ADR-011: Prompt de sistema literal con huella sha256

### Contexto

El comportamiento de la extracción depende del texto exacto del prompt y del modelo. Un cambio pequeño puede degradar los resultados sin que ningún test lo note.

### Decisión

El prompt de sistema es literal e idéntico en el código y en `docs/AI-EXTRACTION.md`, y un test los compara byte a byte. Cualquier cambio de prompt o de modelo necesita la aprobación del autor y una huella sha256 nueva. La huella se comprueba al planificar, no en un test; la vigente empieza por `deeed808…`.

### Alternativas

- Prompt solo en el código: la documentación se queda atrás.
- Un test que fije el sha256: obligaría a editar el test en cada cambio aprobado y no sustituye la aprobación.

### Consecuencias

- Los cambios de prompt son visibles, aprobados y trazables.
- La comparación byte a byte evita que el documento y el código se separen.
- La huella depende de que alguien la verifique al planificar.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [Fase 3, D-25](../.planning/phases/03-autocompletado-con-ia/03-CONTEXT.md), [tarea rápida 261101-qh3](../.planning/quick/261101-qh3-phase-03-ui-review-fixes-icon-stroke-1-5/261101-qh3-PLAN.md), [extracción con IA](AI-EXTRACTION.md).

## ADR-012: Tipo de archivo por magic bytes

### Contexto

El usuario sube CV y cartas. Confiar en el `Content-Type` del navegador o solo en la extensión permitiría guardar y servir un HTML renombrado como PDF.

### Decisión

El tipo se valida por los primeros bytes y por la extensión, y las dos tienen que coincidir. Un PDF empieza por `%PDF-`. Un DOCX es un ZIP con firma `PK\x03\x04` y la entrada `word/document.xml` en el directorio central. Si no, la API responde 415 `UNSUPPORTED_FILE_TYPE`. El `mimeType` que se guarda sale de la firma detectada. No se añade ninguna librería.

### Alternativas

- Una librería de detección de tipos: dependencia nueva para dos formatos.
- Confiar en la extensión o en el `Content-Type`: se falsean con un cambio de nombre.

### Consecuencias

- Un archivo renombrado nunca se guarda ni se sirve con un tipo falso.
- Solo se admiten PDF y DOCX; cualquier otro formato exige ampliar la detección.
- El lector de ZIP es mínimo y rechaza las estructuras que no son un ZIP simple.

Fuentes: [Key Decisions](../.planning/PROJECT.md), [Fase 5, D-02](../.planning/phases/05-documentos-en-s3/05-CONTEXT.md).

## Cómo añadir una decisión

Usa el número siguiente al último y el mismo título corto que en los demás. Escribe las cuatro secciones, `### Contexto`, `### Decisión`, `### Alternativas` y `### Consecuencias`, cada una con al menos una línea. Cierra con una línea `Fuentes:` que enlace de dónde sale cada dato. Después ejecuta `node scripts/check-docs.mjs --adr`.
