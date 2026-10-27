# Fase 5 — Documentos en S3

Uso: `/clear` → `/gsd-discuss-phase 5` → pega el bloque. Research: **Sí** (`@aws-sdk/client-s3` contra pgsty/minio con forcePathStyle, multipart en Hono con límite de tamaño, streaming de GetObject a la respuesta).

```
Decisiones de implementación de la fase 5 (Document y regla 4 en docs/DOMAIN.md):

API
- POST /api/documents multipart (file, type, name, version). Validar mimeType por magic
  bytes además de la extensión: PDF y DOCX únicamente → 415; >5 MB → 413 (cortar antes de
  leer todo en memoria si Hono lo permite; si no, documentar el límite del body).
- Subida a S3 con clave documents/<id>/<filename-saneado>; guardar metadatos en documents.
  Si falla Mongo tras subir, borrar el objeto (compensación).
- GET /api/documents?type=, GET /api/documents/:id/download (stream, Content-Type y
  Content-Disposition attachment con el nombre original), DELETE con 409 DOCUMENT_IN_USE si
  alguna candidatura lo referencia.
- PUT de candidatura valida que cvDocumentId sea de tipo cv y coverLetterDocumentId de tipo carta.

Web
- Pod document-upload: container embebible con props { type, selectedId, onSelected }.
  Muestra un select de documentos existentes de ese tipo («CV Frontend · v3 · 12 oct. 2026»)
  y «Subir nuevo» (input file + nombre + versión, validación de tipo y tamaño en cliente,
  barra de progreso o estado «Subiendo…»).
- Escena de edición: sección «Documentos» con dos DocumentUploadContainer (CV y carta);
  pasa la selección al formulario de application-edit por props/callbacks. Ningún pod
  importa otro.
- Detalle: sección «Documentos» en la columna lateral con enlace de descarga.

Tests: validación de tipos/tamaño, compensación al fallar Mongo, regla 409, mapper del pod.
```
