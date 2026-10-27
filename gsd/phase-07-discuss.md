# Fase 7 — Documentación y defensa

Uso: `/clear` → `/gsd-discuss-phase 7` → pega el bloque. Research: **No**.

```
Decisiones de implementación de la fase 7. Presentación presencial de 15 minutos
(5 de demo) el 9 de noviembre de 2026. Guion exigido por las bases: idea y problema, MVP e
iteraciones completadas, demo, tecnologías y herramientas de IA y cómo se aplicaron, retos y
aprendizajes, próximos pasos.

Entregables (todo en docs/presentacion/ salvo indicación):
1. deck.md: guion de ~10 diapositivas (título, contenido en viñetas, nota del orador y
   tiempo por diapositiva). Lo convertiré yo a diapositivas con la estética Expediente.
   Incluir un diagrama de arquitectura en Mermaid y uno del bucle de GSD.
2. demo-script.md: guion cronometrado de 5 minutos sobre el seed: listado y filtros →
   pegar oferta (fixture) → autocompletar → revisar marcas IA → guardar → añadir ronda →
   adjuntar CV → cambiar estado → volver al listado filtrado. Plan B con LLM_PROVIDER=mock y
   plan C con capturas/vídeo. Checklist previa (docker compose up, seed, modelo descargado,
   zoom del navegador, modo claro).
3. docs/ia-en-el-proyecto.md: cómo se usó GSD + Claude Code (fases, nº de planes, commits,
   PRs y tiempo, sacados de .planning/ y git log), qué funcionó y qué no, y la arquitectura
   de la IA del producto (LlmClient, salida estructurada, local vs cloud y coste).
4. docs/decisiones.md: ADRs breves (contexto, decisión, alternativas, consecuencias):
   monorepo + contracts, pods del curso, Hono + driver oficial, monousuario, Silo frente a
   SeaweedFS/RustFS tras el fin de MinIO CE, Ollama local + proveedor intercambiable,
   imagen + compose, shadcn con el design system.
5. preguntas-tribunal.md: 15 preguntas probables con respuesta corta (p. ej. por qué
   backend si el foco es front, qué pasa si la IA alucina, por qué no React Query, cómo
   escalaría a multiusuario, coste de la IA en producción, qué cambiarías).
6. README: sección «Próximos pasos» con el backlog (Kanban, biblioteca de documentos con CV
   sugerido, dashboard, e2e, login).
7. Capturas actualizadas en docs/presentacion/capturas/ (listado, detalle, formulario con
   marcas IA, modo oscuro, móvil).

Verificación: todos los enlaces internos resuelven; cifras del documento de IA comprobadas
contra git log y .planning/.
```
