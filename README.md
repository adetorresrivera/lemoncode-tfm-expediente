# Expediente

Expediente es un tracker de candidaturas de empleo, monousuario y local. Cada candidatura es un expediente con los datos de la oferta, el estado con su historial, las rondas de entrevista, las etiquetas y el CV vinculado. Pegas la descripción de una oferta y un modelo de lenguaje rellena el formulario para que lo revises.

Es el trabajo fin de curso de «Front End moderno + IA» de Lemoncode.

La documentación del producto vive en `docs/`:

- `docs/PRODUCT.md`: qué es y qué alcance tiene.
- `docs/DOMAIN.md`: modelo de datos y reglas.
- `docs/ARCHITECTURE.md`: estructura, API y despliegue.
- `docs/DESIGN.md`: sistema de diseño y UI.
- `docs/AI-EXTRACTION.md`: la extracción con IA.

## Requisitos

- Docker con Compose v2.20 o posterior.
- Unos 10 GB libres en disco para las imágenes y el modelo local.
- Node 22 y npm 10, solo para desarrollar. El devcontainer ya los incluye.

## Arrancar el entregable

```bash
docker compose up --build
```

Cuando termine de arrancar, abre <http://localhost:8080>. La aplicación te lleva a `/applications`.

La primera vez, el servicio `ollama-init` descarga el modelo `gemma4:e2b` (unos 4,6 GB) en segundo plano. La aplicación funciona mientras tanto: solo la extracción con IA espera a que termine la descarga.

Solo se publican dos puertos, y ambos en la interfaz local:

- `127.0.0.1:8080`: la aplicación.
- `127.0.0.1:9001`: la consola de Silo (almacenamiento compatible con S3).

Las credenciales `minioadmin` / `minioadmin` son solo para desarrollo local. No las uses fuera de tu máquina.

## Si Ollama falla

Arranca con el proveedor simulado, que no necesita modelo ni conexión:

```bash
LLM_PROVIDER=mock docker compose up --build
```

También puedes dejar `LLM_PROVIDER=mock` en tu `.env` (mira «Variables de entorno»).

## Comprobar que todo está sano

El script de humo levanta el stack, comprueba `/api/health`, simula la caída de Mongo y de Silo y verifica que la aplicación se recupera:

```bash
bash scripts/compose-smoke.sh
```

Opciones:

- `--down`: para los contenedores al terminar. Nunca borra los volúmenes.
- `--with-model`: espera además a que `ollama-init` termine de descargar el modelo y comprueba que `gemma4:e2b` está disponible.

El script termina con `SMOKE OK` si todo va bien.

Desde tu máquina (fuera del devcontainer) también puedes comprobarlo a mano:

```bash
curl http://localhost:8080/api/health
```

La respuesta esperada es:

```json
{ "status": "ok", "mongo": "ok", "s3": "ok", "llm": "ok" }
```

## Desarrollo

1. Abre el repositorio en el devcontainer. Levanta Mongo, Silo y Ollama y define las variables de `.env.example`.
2. Instala las dependencias con `npm install`.
3. Arranca con `npm run dev`.

La web queda en <http://localhost:5173> y proxifica `/api` hacia la API, que escucha en el puerto 3000.

## Comandos

```bash
npm install                 # dependencias, desde la raíz
npm run dev                 # web (5173) + api (3000) en paralelo
npm run build               # contracts → api → web
npm run test                # vitest en todos los workspaces
npm run lint                # eslint
npm run typecheck           # tsc --noEmit en todos los workspaces
npm run format              # prettier --write
npm run format:check        # prettier --check
npm run seed                # datos de demo (llega en la fase 6)
docker compose up --build   # entregable completo en http://localhost:8080
```

## Variables de entorno

`.env.example` lista todas las variables que lee la API. Cópialo a `.env` para cambiar valores; Compose lo lee solo.

```bash
cp .env.example .env
```

No subas nunca `.env` al repositorio: está en `.gitignore`. Cualquier clave real, como `LLM_API_KEY` para OpenAI, va únicamente ahí.

## Calidad

- El pre-commit ejecuta ESLint y Prettier sobre los archivos en staging y después el typecheck de todos los workspaces. Un commit con un error de lint o de tipos se rechaza.
- El pre-push ejecuta la suite de tests completa.

## Estado

Este README es el mínimo de la fase 1. La fase 6 lo completa con el seed y el guion de la demo.
