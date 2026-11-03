<!-- GSD:project-start source:PROJECT.md -->

## Project

**Expediente**

Tracker de candidaturas de empleo, monousuario y local, para quien lleva muchos procesos de selección a la vez. Cada candidatura es un «expediente»: datos de la oferta, estado con historial, rondas de entrevista, etiquetas agrupadas y CV/carta vinculados. El usuario pega la descripción de una oferta y un LLM rellena el formulario y propone las etiquetas; el usuario revisa y guarda.

Es el trabajo fin de curso de «Front End moderno + IA» (Lemoncode). Defensa presencial el **9 nov 2026**. UI en español con el design system «Expediente» (pergamino, azul Oxford, burdeos, oro viejo).

**Core Value:** Pegar una oferta y obtener un expediente casi completo y revisable en segundos, con el flujo entero (pegar → guardar → ronda → CV → estado → filtrar) demostrable en menos de 2 minutos con `docker compose up`.

### Constraints

- **Tech stack**: React 19 + TS strict + Vite, TanStack Router/Form, Zod 4, Tailwind v4 + shadcn/ui; Hono + driver `mongodb` + AWS SDK S3 — obligatorio del curso; no cambiar sin ADR en `docs/decisiones.md`
- **Timeline**: defensa el 9 nov 2026; hoy es 28 oct, así que quedan ~12 días para 7 fases — MVP terminado y demostrable antes que funcionalidades a medias
- **Roadmap fijo**: 7 fases, una fase = una PR, con objetivos de fecha 29 oct / 31 oct / 2 nov / 3 nov / 5 nov / 7 nov / 8 nov
- **Contracts**: `packages/contracts` es la única fuente de verdad de los modelos de API; web y API nunca los redefinen
- **Calidad**: sin `any`, sin dependencias nuevas sin justificar en el SUMMARY del plan; todo plan termina con `<verify>` que ejecute al menos `npm run typecheck && npm run test`
- **IA**: debe funcionar sin conexión (Ollama local) y con `LLM_PROVIDER=mock` como plan B
- **UX**: responsive desde 360 px, usable solo con teclado, contraste AA, textos en español (tuteo, sin emojis ni exclamaciones)
- **Seguridad**: secretos solo en `.env`, `.env.example` siempre actualizado; nunca loguear el texto completo de la oferta

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
