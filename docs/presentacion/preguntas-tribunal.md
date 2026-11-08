# Preguntas del tribunal — Expediente

Estas son las quince preguntas que el tribunal puede hacer, con una respuesta corta cada una. Cada respuesta termina con el enlace al documento donde está el detalle.

### 1. ¿Por qué un backend propio si el foco del curso es el front?

El navegador no puede guardar las credenciales de S3 ni la clave de un modelo, y MongoDB necesita un servidor delante. Por eso la API es fina: Hono con el driver oficial, sin ODM. Comparte los esquemas Zod con la web, así que el trabajo sigue estando en el front. Detalle en [ADR-003](../decisiones.md#adr-003-hono-con-el-driver-oficial-de-mongodb) y [ADR-001](../decisiones.md#adr-001-monorepo-con-npm-workspaces-y-contratos-en-tfmcontracts).

### 2. ¿Qué pasa si la IA alucina?

No se guarda nada por sí solo: el análisis devuelve un borrador y solo rellena campos vacíos del formulario. Cada campo rellenado lleva la marca «IA» hasta que lo editas. Zod rechaza la salida mal formada y la llamada se reintenta una vez. En la demo corriges un campo en directo y la marca desaparece; el detalle está en [ADR-010](../decisiones.md#adr-010-el-borrador-de-la-ia-nunca-se-guarda-solo).

### 3. ¿Por qué no usaste React Query?

Para un solo usuario bastan hooks con `fetch` y `AbortController` que ignoran las respuestas obsoletas, como se enseña en el curso. El MVP no comparte caché entre pantallas y una dependencia más no aportaba nada. React Query es el paso siguiente si llegan caché compartida o varios usuarios. Detalle en [ADR-009](../decisiones.md#adr-009-hooks-de-datos-propios-sin-react-query).

### 4. ¿Cómo escalaría a multiusuario?

Primero se añade el login. Después se usa `ownerId`, que hoy está reservado y vale siempre `null`, como filtro en cada consulta de los repositorios y en las claves de S3. Con eso se podría pensar en un despliegue en la nube. Detalle en [ADR-004](../decisiones.md#adr-004-aplicación-monousuario-y-local).

### 5. ¿Qué coste tendría la IA en producción?

Una extracción medida usa unos 1192 tokens de entrada y unos 183 de salida, contados con el tokenizador de OpenAI. Con modelos pequeños compatibles con OpenAI, 10 000 ofertas al mes cuestan entre 1,33 y 17,18 USD, según el modelo de la tabla. En local el coste marginal es cero, pero cada extracción tarda en CPU. Las cuentas y las salvedades están en [Coste: local frente a la nube](../ia-en-el-proyecto.md#coste-local-frente-a-la-nube).

### 6. ¿Qué cambiarías si empezaras de nuevo?

Escribiría tests e2e del flujo de la demo desde las primeras fases, en lugar de una sola pasada de navegador al final (E2E-01). Daría un bloqueo por candidatura a las mutaciones, porque hoy hay un único bloqueo `busy` que puede perderse si hay una mutación en vuelo. Y mediría el tiempo de cada plan desde el primer día, porque solo 55 de 62 archivos SUMMARY tienen `duration`. Lo que funcionó y lo que no está en [Qué funcionó y qué no](../ia-en-el-proyecto.md#qué-funcionó-y-qué-no), y el aviso del bloqueo en [04-REVIEW-DISPOSITION.md](../../.planning/phases/04-rondas-de-entrevista/04-REVIEW-DISPOSITION.md).

### 7. ¿Por qué un modelo local con Ollama y no uno en la nube?

Funciona sin conexión, la oferta no sale de tu máquina y el coste marginal es cero. El proveedor es intercambiable: pasar a un endpoint compatible con OpenAI es cambiar variables de entorno como `LLM_PROVIDER`. El precio del modelo local es la latencia, que se compensa calentándolo antes de la demo. Detalle en [ADR-006](../decisiones.md#adr-006-ollama-local-con-proveedor-intercambiable).

### 8. ¿Cómo evitas que la web y la API se desincronicen?

`@tfm/contracts` es la única fuente de los modelos de la API, con esquemas Zod y tipos inferidos. La web y la API importan de ahí y nunca los redefinen. Un cambio de contrato rompe el `typecheck` de los dos lados antes de llegar al navegador. Detalle en [ADR-001](../decisiones.md#adr-001-monorepo-con-npm-workspaces-y-contratos-en-tfmcontracts).

### 9. ¿Por qué la arquitectura de pods y un view model propio?

Es la arquitectura del curso, y así se puede leer con el mismo criterio. El mapper convierte el modelo de la API en el view model del pod, de modo que un cambio de contrato toca un solo archivo. Los componentes solo ven lo que pintan. Detalle en [ADR-002](../decisiones.md#adr-002-arquitectura-de-pods-del-curso).

### 10. ¿Cómo has comprobado la accesibilidad?

Con axe en los tests de cada pantalla, en tema claro y oscuro, y con un test de contraste AA de los tokens, porque jsdom no evalúa el contraste. Además hubo un recorrido solo con teclado y una pasada automática de navegador a 360, 768 y 1280 px. Esa pasada encontró chips por debajo de 44 px, y quedaron corregidos. El registro está en [06-UAT.md](../../.planning/phases/06-pulido-de-demo/06-UAT.md) y los tests en [a11y.test.tsx](../../apps/web/src/test/a11y.test.tsx).

### 11. ¿Cómo pruebas la extracción si el modelo no es determinista?

Los tests usan el proveedor `mock`, que devuelve siempre el mismo borrador. El modelo real se mide con tres ofertas de prueba que tienen los campos esperados, mediante el script `try-extract`. La petición va con temperatura 0 y cada respuesta pasa por Zod antes de llegar al formulario. Detalle en [La IA dentro del producto](../ia-en-el-proyecto.md#la-ia-dentro-del-producto) y en las [ofertas de prueba](../../apps/api/src/offers/__fixtures__/fixtures.ts).

### 12. ¿Qué parte escribió la IA y cómo la revisaste?

Casi todo el código y los documentos los escribió Claude Code, con planes de GSD que el autor aprobó. Cada fase pasó por verificador de planes, verificador, revisión de código, auditoría de seguridad y la prueba de aceptación del autor. De 544 commits, 290 llevan el trailer `Co-Authored-By`. El flujo y las cifras están en [Cómo se usó la IA en el desarrollo](../ia-en-el-proyecto.md#cómo-se-usó-la-ia-en-el-desarrollo).

### 13. ¿Qué pasa si cambias el prompt o el modelo?

El prompt de sistema es literal e idéntico en el código y en `docs/AI-EXTRACTION.md`, y un test los compara byte a byte. Cualquier cambio necesita la aprobación del autor y una huella sha256 nueva, que se comprueba al planificar y no en un test. Así los cambios son visibles y trazables. Detalle en [ADR-011](../decisiones.md#adr-011-prompt-de-sistema-literal-con-huella-sha256).

### 14. ¿Cómo validas los archivos que se suben?

El tipo sale de los primeros bytes y de la extensión, y las dos deben coincidir. Un PDF empieza por `%PDF-` y un DOCX es un ZIP con su directorio de entradas. Cualquier otra cosa recibe un 415, sin añadir ninguna librería. Detalle en [ADR-012](../decisiones.md#adr-012-tipo-de-archivo-por-magic-bytes).

### 15. ¿Por qué Silo y no MinIO?

MinIO Community Edition entró en modo de mantenimiento en diciembre de 2025 y su repositorio quedó archivado en febrero de 2026. Silo es un fork mantenido de MinIO con el que habla el SDK de AWS. Cambiar de servidor solo toca las variables `S3_*`. Detalle en [ADR-005](../decisiones.md#adr-005-silo-como-s3-local-tras-el-fin-de-minio-ce).
