# Fase 6 — Pulido de demo

Uso: `/clear` → `/gsd-discuss-phase 6` → pega el bloque. Research: **No**.

```
Decisiones de implementación de la fase 6. Objetivo: que la demo del 9 de noviembre no
falle y que una máquina limpia arranque todo con un comando.

Seed (npm run seed, también docker compose exec app npm run seed)
- Idempotente: borra y recrea applications y documents de demo (marca seed: true).
- 12 candidaturas variadas: todos los estados, 3 con varias rondas, historiales coherentes
  con fechas de las últimas 6 semanas, etiquetas realistas, 2 CV y 1 carta (PDF de ejemplo
  generados o en apps/api/src/scripts/assets/) vinculados.
- Las 3 fixtures de ofertas quedan accesibles para la demo en docs/demo/ofertas/*.txt.

Robustez
- Revisión de estados de carga, error y vacío en todas las vistas.
- Responsive revisado a 360, 768 y 1280 px sin scroll horizontal.
- Accesibilidad: recorrido completo con teclado, labels, foco visible, aria-live; pasar
  axe (vitest-axe o @axe-core) en listado, detalle y formulario.
- Modo mock documentado: LLM_PROVIDER=mock docker compose up.
- Imagen: tamaño razonable, versiones fijadas, healthchecks, arranque en frío probado tras
  docker compose down -v.

README final (en español)
- Qué es, captura, requisitos (Docker), arranque en 3 comandos, seed, cambiar de modelo
  (Ollama / Gemini / Groq / mock), desarrollo con devcontainer, estructura, scripts,
  enlaces a docs/.

Tests pendientes: cubrir lo que falte de reglas de negocio y mappers; npm run test en verde.
```
