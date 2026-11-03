# Feature de IA — autocompletar desde una oferta

## Flujo
1. En el formulario, el usuario pega la descripción de la oferta (50–20.000 caracteres) y pulsa «Autocompletar con IA».
2. Web → `POST /api/offers/extract { text }`.
3. API → `LlmClient.extractStructured(prompt, text, offerExtractionSchema)` → valida con Zod → normaliza → responde `OfferExtraction`.
4. Web (mapper del pod `application-edit`) **fusiona** con los valores actuales del formulario:
   - Campo vacío (`""`/`null`) → se rellena y se marca «IA».
   - Campo que sigue marcado «IA» (lo rellenó un análisis anterior y el usuario no lo ha editado) → cuenta como vacío: se sustituye por el valor nuevo, o se vacía si la nueva extracción no lo trae (la moneda vuelve a EUR).
   - Campo con valor del usuario (escrito o editado por él) → no se toca.
   - Salario y moneda → el relleno nunca invierte el rango frente a un salario del usuario. La moneda se rellena solo si ningún extremo del salario es del usuario, el análisis ha rellenado alguno y la moneda seguía marcada «IA» o ambos extremos estaban vacíos.
   - Etiquetas → las que propuso la IA y siguen en la lista se sustituyen por las nuevas; con las del usuario se hace la unión sin duplicados (comparación en minúsculas). Las del usuario no cambian y ganan en un duplicado.
   - Marcas «IA» y «faltan» → se recalculan con el resultado del análisis nuevo.
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
El JSON Schema que se envía al modelo se obtiene con `z.toJSONSchema(modelOfferExtractionSchema)` (Zod 4): el esquema del contrato con el grupo de etiqueta `idioma` en lugar de `language` (ver LlmClient), más un campo obligatorio `idiomas` (idiomas hablados con nivel, máximo 20, de 1 a 40 caracteres cada uno) que el contrato no tiene. El contrato conserva `language` y no tiene `idiomas`.

## LlmClient (`apps/api/src/llm/`)
```ts
export interface LlmClient {
  // `schema` valida la respuesta cruda; `options.responseSchema` (por defecto `schema`) es el
  // JSON Schema que se le muestra al modelo; `options.signal` cancela la llamada.
  extractStructured<T>(
    system: string,
    input: string,
    schema: z.ZodType<T>,
    options?: LlmCallOptions,
  ): Promise<T>;
  ping(): Promise<boolean>; // para /api/health
}
export function createLlmClient(config: LlmConfig): LlmClient; // según LLM_PROVIDER
```
| Provider | Llamada | Salida estructurada |
|---|---|---|
| `ollama` | `POST {LLM_BASE_URL}/api/chat` con `stream:false`, `options.temperature:0` | parámetro `format` = JSON Schema |
| `openai` | `POST {LLM_BASE_URL}/chat/completions` con `Authorization: Bearer` | `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }` |
| `mock` | sin red | devuelve un `OfferExtraction` fijo y realista tras 300 ms |

- Timeout `LLM_TIMEOUT_MS` (90 s por defecto) con `AbortSignal.timeout` → 504 `LLM_TIMEOUT`.
- Al modelo se le muestra siempre el JSON Schema de `modelOfferExtractionSchema` (en `offers/extract.service.ts`). La respuesta cruda se valida con un esquema más permisivo (`rawOfferExtractionSchema`, en el mismo archivo: etiquetas de cualquier longitud y número, `currency` libre, salarios sin signo exigido) que además acepta `idioma` y lo convierte en `language` antes de normalizar, y acepta `idiomas` ausente o `null`; el resultado normalizado se vuelve a validar con `offerExtractionSchema`.
- Respuesta no parseable o que no cumple ni siquiera el esquema permisivo → un reintento; si vuelve a fallar → 502 `LLM_ERROR`.
- Si el modelo es de razonamiento (p. ej. qwen3), desactivar el modo «thinking».
- Nunca loguear el texto completo de la oferta; solo longitud y duración.

Modelos de referencia: local `gemma4:e2b` (Ollama, CPU viable; confirmar tag en ollama.com/library). Cloud barato: `gemini-2.5-flash-lite` vía endpoint OpenAI-compatible de Gemini, o Groq (free tier). El cambio es solo de variables de entorno.

## Prompt de sistema (`offers/extract.service.ts`)
```
Eres un extractor de datos de ofertas de empleo en español o inglés.
Devuelve solo los campos del esquema. Reglas:
- Si un dato no aparece explícitamente en el texto, usa null. No inventes ni deduzcas empresa ni salario.
- title: el nombre del puesto tal como aparece, sin la empresa.
- company: la empresa que publica la oferta.
- salaryMin/salaryMax: salario anual bruto como número sin símbolos ni separadores. Si se da un único valor, ponlo en ambos. Si es mensual, multiplícalo por 12. "45-55k" → 45000 y 55000.
- currency: código ISO 4217 (EUR, USD, GBP). Si hay "€", EUR.
- workMode: remoto, hibrido o presencial. "Teletrabajo 100%" → remoto.
- seniority: junior (0-2 años), mid (2-5), senior (5+), lead (liderazgo de equipo).
- contractType: indefinido, temporal, freelance, practicas u otro.
- tags:
  - stack: tecnologías, lenguajes, frameworks, cloud y herramientas requeridas.
  - nice_to_have: lo que la oferta marca como "se valora", "plus", "deseable".
  - label es el nombre de la tecnología (p. ej. "React"), nunca el nombre del grupo.
  - Grafía canónica (React, TypeScript, C#, .NET 8, AWS). Sin duplicados. Máximo 20.
- idiomas: los idiomas hablados que pide la oferta, con nivel si aparece ("Inglés B2", "Coreano B1"). Van aquí, nunca en tags.
```
Iteración futura: añadir al prompt las etiquetas existentes de `GET /api/tags` para reutilizar el vocabulario del usuario.

## Normalización en la API
- `trim` de strings; strings vacíos → `null`.
- Si `salaryMin > salaryMax`, intercambiar.
- Etiquetas: deduplicar por minúsculas, quitar vacías, recortar a 40 caracteres y conservar las 20 primeras (primero las de `idiomas`, luego las de `tags`, cada grupo en el orden del modelo).
- Idiomas: cada entrada de `idiomas` pasa a ser una etiqueta de grupo `language` sin pasar por la lista cerrada (el modelo ya la ha separado como idioma hablado), con el mismo `trim`, el mismo recorte a 40 caracteres y descartando las vacías. Estas etiquetas van antes que las de `tags`, así que en un duplicado (comparado en minúsculas) gana la de `idiomas`, y el límite de 20 nunca elimina un idioma porque el modelo haya devuelto muchas etiquetas.
- Grupo de etiquetas (respaldo para las etiquetas que llegan dentro de `tags`): `language` (o su alias `idioma`) se conserva solo si la etiqueta nombra un idioma hablado de una lista cerrada de idiomas (`SPOKEN_LANGUAGE_WORDS` en `offers/extract.service.ts`): inglés/english, español/spanish/castellano, francés/french, alemán/german, italiano/italian, portugués/portuguese, catalán/català, euskera, gallego, valenciano, neerlandés/holandés/dutch, chino/mandarín/chinese, japonés/japanese, árabe/arabic, ruso/russian, polaco/polish, sueco/swedish, bilingüe. Se compara palabra completa, en minúsculas y sin tildes; si no coincide, la etiqueta pasa a `stack` (p. ej. C, Python, Java). La deduplicación se hace después del cambio; `stack` y `nice_to_have` no se tocan.
- `currency` que no sea un código de tres letras (p. ej. `"€"`) → `null`; en mayúsculas si lo es. Un salario negativo → `null`.

## Tests (Vitest)
- `mock.provider` devuelve datos que cumplen el esquema.
- `extract.service` con un `LlmClient` falso: normaliza salarios, deduplica etiquetas, propaga timeout como 504.
- `ollama.provider` y `openai.provider` con `fetch` mockeado: cuerpo de la petición correcto (`format` / `response_format`) y parseo de la respuesta.
- Mapper web: fusión que no pisa valores del usuario y calcula marcas «IA» y «faltan».
- Fixtures: 3 ofertas anonimizadas en `apps/api/src/offers/__fixtures__/` (remoto senior con rango salarial; presencial junior sin salario; oferta en inglés con «nice to have»). Se reutilizan en el seed y en la demo.
