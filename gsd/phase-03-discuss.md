# Fase 3 — Autocompletado con IA

Uso: `/clear` → `/gsd-discuss-phase 3` → pega el bloque. Research: **Sí** (Ollama structured outputs con `format`, `response_format` json_schema en APIs OpenAI-compatible de Gemini/Groq, `z.toJSONSchema` y compatibilidad del schema resultante con ambos).

```
Decisiones de implementación de la fase 3. Especificación completa en docs/AI-EXTRACTION.md:
contrato, providers, prompt, normalización, errores y tests. Síguela al pie de la letra.

Puntos a remarcar:
- LlmClient con providers ollama, openai y mock elegidos por LLM_PROVIDER. Sin SDKs de
  proveedores: fetch nativo.
- POST /api/offers/extract: valida { text } 50–20.000; timeout → 504 LLM_TIMEOUT; respuesta
  inválida → un reintento → 502 LLM_ERROR. No loguear el texto.
- /api/health incluye llm con ping del provider.
- Web, pod application-edit:
  - api/api.ts → extractOffer(text, signal).
  - mapper mergeExtractionIntoForm(current, extraction) → { values, aiFields, missingFields }
    (solo rellena vacíos, une etiquetas sin duplicados, asigna offerText).
  - Panel «Pegar oferta» según DESIGN.md: abierto en alta, plegado en edición; botón primary
    con Sparkles; mensaje de progreso «Analizando la oferta…» con aria-live; botón cancelar
    (AbortController); error amable que no bloquea el formulario.
  - Marca «IA» junto al label de cada campo en aiFields; desaparece al editar ese campo.
    Campos en missingFields con borde brand-gold, bg-ai-missing-bg y «Complétalo tú».
- 3 fixtures de ofertas en apps/api/src/offers/__fixtures__/ (descritas en AI-EXTRACTION.md).
- Probar manualmente con Ollama (gemma4:e2b) las 3 fixtures y anotar en el SUMMARY la
  calidad y el tiempo de cada una. Si gemma4:e2b no está disponible en Ollama, proponer el
  modelo pequeño más cercano y preguntarme antes de cambiarlo.
```
