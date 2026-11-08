# Phase 5: Documentos en S3 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-03
**Phase:** 05-documentos-en-s3
**Areas discussed:** Nombre original, Picker en el formulario, Documentos en el detalle, Borrar desde la UI

El usuario fijó al lanzar la fase la API (multipart, magic bytes, 413/415, clave S3, compensación, GET/download/DELETE 409 y validación de tipo en PUT), el pod `document-upload` embebible y las secciones del formulario y del detalle. En la discusión solo se trataron los puntos que quedaban abiertos.

---

## Nombre original

| Option | Description | Selected |
|--------|-------------|----------|
| Añadir fileName | Campo nuevo en el contrato con el nombre original; `filename*` UTF-8 | ✓ |
| Sacarlo de la s3Key | Nombre saneado, sin acentos | |
| Nombre + versión | «CV Frontend v3.pdf» compuesto | |

| Option | Description | Selected |
|--------|-------------|----------|
| Slug ASCII | NFD, minúsculas, [a-z0-9._-], máx. 100, extensión forzada | ✓ |
| Nombre fijo | `file.pdf` / `file.docx` | |
| Tú decides | Criterio de Claude | |

| Option | Description | Selected |
|--------|-------------|----------|
| 415 si no coinciden | La extensión y la firma tienen que coincidir; mimeType sale de la firma | ✓ |
| Mandan los bytes | Se acepta por firma y se corrige la extensión | |

## Picker en el formulario

| Option | Description | Selected |
|--------|-------------|----------|
| Slot renderDocumentPicker | Render prop como `renderCancelLink`; valor en TanStack Form | ✓ |
| Estado en la escena | useState en la escena, pickers fuera del form | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog | «Subir nuevo» en un Dialog con formulario propio | ✓ |
| Inline sin form | Campos en la sección con botón type=button | |

| Option | Description | Selected |
|--------|-------------|----------|
| Se queda en la biblioteca | La subida es independiente de la candidatura | ✓ |
| Borrarlo al descartar | El pod borra lo subido en la sesión | |

| Option | Description | Selected |
|--------|-------------|----------|
| native-select con «Sin CV» | Opción null para desvincular, más nuevo primero | ✓ |
| Lista de radios | Tarjeta por documento | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nombre desde el archivo | Prerrelleno sin extensión; versión obligatoria | ✓ |
| Todo a mano | Campos vacíos | |

| Option | Description | Selected |
|--------|-------------|----------|
| Estado «Subiendo…» | fetch + AbortController | ✓ |
| Barra con XHR | upload.onprogress | |

## Documentos en el detalle

| Option | Description | Selected |
|--------|-------------|----------|
| GET /api/documents/:id | Endpoint nuevo, una petición por id | ✓ |
| Cruzar con GET /api/documents | Sin endpoint nuevo, descarga toda la biblioteca | |
| Incrustar en la respuesta | Cambia el contrato de Application | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dos filas fijas | CV y Carta siempre, con «Sin CV vinculado.» | ✓ |
| Solo los vinculados | Lista compacta | |

| Option | Description | Selected |
|--------|-------------|----------|
| Degradar la fila | Solo la fila muestra el error; 404 si falta en S3 | ✓ |
| Error en toda la sección | Reintentar sección | |

| Option | Description | Selected |
|--------|-------------|----------|
| 400 en POST y PUT | Validar existencia y tipo también al crear | ✓ |
| Solo PUT, como en el brief | POST sin validar | |

## Borrar desde la UI

| Option | Description | Selected |
|--------|-------------|----------|
| Botón en el picker | Trash2 junto al select con AlertDialog | |
| Solo API | Sin UI | |
| Pantalla /documents | Ruta, escena y pod nuevos con lista y borrado | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Lista + filtro + borrar | Sin subida en la pantalla | |
| Lo anterior + «Subir documento» | Escena renderiza DocumentUploadContainer en modo solo subida | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| No, solo el 409 | Sin cambio de contrato | |
| Marca «En uso» | `usedBy` en la lista | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Campo Tipo en el diálogo | Toggle CV/Carta cuando el pod se monta sin `type` | ✓ |
| Dos botones | «Subir CV» y «Subir carta» | |

| Option | Description | Selected |
|--------|-------------|----------|
| Habilitado, el 409 explica | La regla 4 se ve en directo | ✓ |
| Deshabilitado | Preventivo | |

## Claude's Discretion

- Textos exactos de errores 413/415 y validación.
- Orden y tratamiento de errores del borrado Mongo/S3.
- Silo real o cliente falso en los tests de API que no son de compensación.
- Forma de las props de `DocumentUploadContainer` y del esquema del ítem con `usedBy`.
- Estados vacíos de `/documents`.

## Deferred Ideas

Ninguna nueva. LIB-01 y LIB-02 siguen en v2.
