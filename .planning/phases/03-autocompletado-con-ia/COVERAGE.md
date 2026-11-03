# API Coverage — Phase 3 external services (Ollama, OpenAI-compatible chat completions)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Detector result at plan time: `{"detected": false}` on the roadmap section. The phase still calls two external LLM APIs through native `fetch` (D-01, no SDK): Ollama (`LLM_PROVIDER=ollama`, local `gemma4:e2b`) and any OpenAI-compatible endpoint (`LLM_PROVIDER=openai`, e.g. Gemini or Groq). The `mock` provider has no external surface. The project's own `POST /api/offers/extract` is internal and covered by plans 03-01 and 03-03.

## Ollama (HTTP API, devcontainer 0.40.13 / compose image 0.40.3) — plans 03-02, 03-09

| capability | decision | reason |
|---|---|---|
| ollama:POST /api/chat non-streaming with format = JSON Schema (structured output) | INTEGRATE | |
| ollama:think false on /api/chat (thinking models such as gemma4:e2b) | INTEGRATE | |
| ollama:options.temperature and options.num_ctx | INTEGRATE | |
| ollama:GET /api/version as health ping | INTEGRATE | |
| ollama:streaming responses (stream true) | OPT-OUT | not needed — the form waits for one complete JSON draft; streaming adds partial-JSON handling for no user value |
| ollama:/api/generate, embeddings, tools, images and audio inputs | OPT-OUT | explicitly out of scope — the feature is one text-to-structured-draft call (docs/AI-EXTRACTION.md) |
| ollama:model management (/api/pull, /api/tags, keep_alive) from the API | OPT-OUT | not needed — the compose `ollama-init` service pulls the model; keep_alive is not in the spec (RESEARCH Pitfall 12) |

## OpenAI-compatible chat completions — plans 03-02, 03-09

| capability | decision | reason |
|---|---|---|
| openai:POST /chat/completions with response_format json_schema (strict) | INTEGRATE | |
| openai:Bearer API key authentication from LLM_API_KEY | INTEGRATE | |
| openai:GET /models as health ping | INTEGRATE | |
| openai:streaming (stream true) | OPT-OUT | not needed — same reason as Ollama |
| openai:tool or function calling, vision, audio, embeddings, batch | OPT-OUT | explicitly out of scope — one structured extraction per request |
| openai:live call against a real vendor in tests | OPT-OUT | not needed — no key in the devcontainer and CI uses LLM_PROVIDER=mock; covered by stubbed-fetch tests (03-VALIDATION.md manual-only row) |
