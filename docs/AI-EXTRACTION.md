# Feature de IA — autocompletar desde una oferta

## Flujo
1. En el formulario, el usuario pega la descripción de la oferta (50–20.000 caracteres) y pulsa «Autocompletar con IA».
2. Web → `POST /api/offers/extract { text }`.
3. API → `LlmClient.extractStructured(prompt, text, offerExtractionSchema)` → valida con Zod → normaliza → responde `OfferExtraction`.
4. Web (mapper del pod `application-edit`) **fusiona** con los valores actuales del formulario:
   - Campo vacío (`""`/`null`) → se rellena y se marca «IA».
   - Campo con valor del usuario → no se toca.
   - Etiquetas → unión sin duplicados (comparación en minúsculas).
   - Campos que siguen vacíos tras la extracción y son relevantes (título, empresa, modalidad, seniority) → resaltados como «faltan».
   - `offerText` ← texto pegado.
5. El usuario revisa y guarda. Nada se persiste en el paso 3.

## Contrato (`packages/contracts/src/offer-extraction.schema.ts`)
```ts
export const offerExtractionSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  workMode: workModeSchema.nullable(),
  seniority: senioritySchema.nullable(),
  contractType: contractTypeSchema.nullable(),
  salaryMin: z.number().nonnegative().nullable(),
  salaryMax: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  tags: z.array(tagSchema).max(20),   // { label, group: "stack" | "nice_to_have" | "language" }
});
```
El JSON Schema que se envía al modelo se obtiene con `z.toJSONSchema(offerExtractionSchema)` (Zod 4).

## LlmClient (`apps/api/src/llm/`)
```ts
export interface LlmClient {
  extractStructured<T>(system: string, input: string, schema: z.ZodType<T>): Promise<T>;
  ping(): Promise<boolean>; // para /api/health
}
export function createLlmClient(config: LlmConfig): LlmClient; // según LLM_PROVIDER
```
| Provider | Llamada | Salida estructurada |
|---|---|---|
| `ollama` | `POST {LLM_BASE_URL}/api/chat` con `stream:false`, `options.temperature:0` | parámetro `format` = JSON Schema |
| `openai` | `POST {LLM_BASE_URL}/chat/completions` con `Authorization: Bearer` | `response_format: { type: "json_schema", json_schema: { name, schema } }` |
| `mock` | sin red | devuelve un `OfferExtraction` fijo y realista tras 300 ms |

- Timeout `LLM_TIMEOUT_MS` (90 s por defecto) con `AbortSignal.timeout` → 504 `LLM_TIMEOUT`.
- Respuesta no parseable o que no cumple el esquema → un reintento; si vuelve a fallar → 502 `LLM_ERROR`.
- Si el modelo es de razonamiento (p. ej. qwen3), desactivar el modo «thinking».
- Nunca loguear el texto completo de la oferta; solo longitud y duración.

Modelos de referencia: local `gemma4:e2b` (Ollama, CPU viable; confirmar tag en ollama.com/library). Cloud barato: `gemini-2.5-flash-lite` vía endpoint OpenAI-compatible de Gemini, o Groq (free tier). El cambio es solo de variables de entorno.

## Prompt de sistema (`offers/extract.service.ts`)
```
Eres un extractor de datos de ofertas de empleo en español o inglés.
Devuelve solo los campos del esquema. Reglas:
- Si un dato no aparece explícitamente en el texto, usa null. No inventes ni deduzcas empresa ni salario.
- title: el nombre del puesto tal como aparece, sin la empresa.
- salaryMin/salaryMax: salario anual bruto como número sin símbolos ni separadores. Si se da un único valor, ponlo en ambos. Si es mensual, multiplícalo por 12. "45-55k" → 45000 y 55000.
- currency: código ISO 4217 (EUR, USD, GBP). Si hay "€", EUR.
- workMode: remoto, hibrido o presencial. "Teletrabajo 100%" → remoto.
- seniority: junior (0-2 años), mid (2-5), senior (5+), lead (liderazgo de equipo).
- contractType: indefinido, temporal, freelance, practicas u otro.
- tags:
  - stack: tecnologías, lenguajes, frameworks, cloud y herramientas requeridas.
  - nice_to_have: lo que la oferta marca como "se valora", "plus", "deseable".
  - language: idiomas con nivel si aparece ("Inglés B2").
  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.
```
Iteración futura: añadir al prompt las etiquetas existentes de `GET /api/tags` para reutilizar el vocabulario del usuario.

## Normalización en la API
- `trim` de strings; strings vacíos → `null`.
- Si `salaryMin > salaryMax`, intercambiar.
- Etiquetas: deduplicar por minúsculas, quitar vacías, recortar a 40 caracteres.

## Tests (Vitest)
- `mock.provider` devuelve datos que cumplen el esquema.
- `extract.service` con un `LlmClient` falso: normaliza salarios, deduplica etiquetas, propaga timeout como 504.
- `ollama.provider` y `openai.provider` con `fetch` mockeado: cuerpo de la petición correcto (`format` / `response_format`) y parseo de la respuesta.
- Mapper web: fusión que no pisa valores del usuario y calcula marcas «IA» y «faltan».
- Fixtures: 3 ofertas anonimizadas en `apps/api/src/offers/__fixtures__/` (remoto senior con rango salarial; presencial junior sin salario; oferta en inglés con «nice to have»). Se reutilizan en el seed y en la demo.
