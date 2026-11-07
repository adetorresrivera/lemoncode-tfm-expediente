# La IA en el proyecto — Expediente

La IA aparece en Expediente de dos maneras. Se usó para construir el proyecto, con GSD y Claude Code. Y está dentro del producto, donde un modelo local rellena el formulario a partir de la oferta que pegas. Este documento cuenta las dos cosas con cifras que se pueden recalcular con un comando.

## Cómo se usó la IA en el desarrollo

El proyecto se construyó con GSD, un flujo de trabajo por fases que corre sobre Claude Code. Cada fase repite el mismo ciclo, y cada paso deja un archivo en `.planning/phases/` que se puede leer después.

1. **Discutir.** El agente hace preguntas hasta fijar las decisiones de la fase. Quedan como `D-NN` en `NN-CONTEXT.md`.
2. **Planificar.** Investigación (`NN-RESEARCH.md`), mapa de patrones (`NN-PATTERNS.md`), planes (`NN-NN-PLAN.md`) y una pasada de un verificador de planes antes de ejecutar.
3. **Ejecutar.** Un agente por plan. Los planes independientes corren en paralelo, en oleadas, cada uno en su propio worktree de git, con commits atómicos. Al terminar cada plan escribe su `NN-NN-SUMMARY.md`.
4. **Verificar.** Un verificador contrasta la fase con sus objetivos (`NN-VERIFICATION.md`). Después, el autor hace la prueba de aceptación (`NN-UAT.md`).
5. **Revisar.** Revisión de código, auditoría de seguridad (ASVS nivel 1) y revisión de interfaz. Los hallazgos quedan en `NN-REVIEW.md`, `NN-SECURITY.md` y `NN-UI-REVIEW.md`.
6. **Entregar.** Una pull request por fase, hacia `main`.

Si la prueba de aceptación encuentra un hueco, vuelve a planificar: el plan nuevo es de cierre de huecos y se ejecuta dentro de la misma fase. Los arreglos pequeños, sin fase, pasan por tareas rápidas en `.planning/quick/`.

Qué hizo el autor, y no la IA:

- Fijó la hoja de ruta y sus fases.
- Respondió todas las preguntas de la fase de discusión.
- Aprobó las únicas dependencias nuevas: `@tanstack/react-form` 1.33.5 y, solo para desarrollo, `axe-core` 4.14.0.
- Aprobó cada cambio del prompt de sistema con su huella sha256.
- Hizo las pruebas de aceptación, con su propio cronómetro en la demo.
- Fusionó las pull requests.

La fase 7 es de «documentación» y no tiene cifras en este documento. Los números llegan hasta el final de la fase 6. Para el contexto completo, mira [la hoja de ruta](../.planning/ROADMAP.md) y [el estado del proyecto](../.planning/STATE.md).

## Cifras

Los valores son los del corte `c11ab61`, el final de la fase 6. Cada línea se recalcula con `node scripts/check-figures.mjs`.

```text
corte: c11ab61
commit_merge_pr_6: 9c70231
primer_commit: 2026-10-27
fecha_merge_pr_6: 2026-11-07
dias_naturales: 12
dias_con_commits: 11
commits_total: 544
commits_merge: 71
commits_sin_merge: 473
commits_merge_worktree: 71
commits_docs: 289
commits_feat: 86
commits_chore: 78
commits_test: 58
commits_fix: 28
commits_refactor: 2
commits_otros: 3
commits_coautoria: 290
commits_fase_1: 80
commits_fase_2: 73
commits_fase_3: 139
commits_fase_4: 45
commits_fase_5: 86
commits_fase_6: 120
commits_raiz: 1
prs: 6
fases_cerradas: 6
planes: 62
planes_fase_1: 6
planes_fase_2: 12
planes_fase_3: 12
planes_fase_4: 4
planes_fase_5: 11
planes_fase_6: 17
planes_cierre_huecos: 5
tareas_rapidas: 4
summaries: 62
summaries_con_duracion: 55
duracion_total_min: 1512
duracion_fase_1_min: 240
duracion_fase_2_min: 346
duracion_fase_3_min: 188
duracion_fase_4_min: 162
duracion_fase_5_min: 214
duracion_fase_6_min: 362
tests: 1416
```

Del primer commit (2026-10-27) a la fusión de la PR 6 (2026-11-07) pasan 12 días naturales. Hay commits en 11 de ellos.

El historial tiene 544 commits. De ellos, 289 son de tipo `docs`, más de la mitad del total: son los artefactos de planificación de GSD, no documentación escrita a mano. Los 78 de tipo `chore` incluyen las 71 fusiones de worktrees de los agentes. Por fase hay 80, 73, 139, 45, 86 y 120 commits. A ellos se suma el commit raíz «First commit», que queda fuera de todos los rangos por fase. Los seis rangos y el commit raíz suman los 544.

Hay 62 planes repartidos en 6 fases, 5 de ellos de cierre de huecos, y 4 tareas rápidas. Las 6 PR fusionadas cierran las 6 fases, una por fase. La suite de pruebas cuenta 1416 tests.

El tiempo sale de los archivos de resumen: 1512 minutos sumados en 55 de los 62 archivos SUMMARY. Los siete sin `duration` son `03-03`, `03-09`, `06-06`, `06-07`, `06-10`, `06-11` y `06-16`, y no entran en la suma. Cada duración es el dato que cada agente anotó de su propio plan. No es un cronómetro. Además, los planes corrieron en paralelo, así que los minutos no se pueden leer como tiempo de reloj. Las métricas de rendimiento de `STATE.md` muestran `-`: GSD no las agregó, por eso el tiempo se reconstruyó desde los archivos de resumen.

## Cómo se calculó

Todos los comandos se anclan en el commit `c11ab61`, así que dan el mismo resultado aunque el repositorio siga creciendo.

```bash
CUT=c11ab61
git rev-list --count $CUT                                   # commits_total
git rev-list --merges --count $CUT                          # commits_merge
git log --format=%s $CUT | sed -E 's/^([a-z]+)(\([^)]*\))?!?:.*/\1/;t;s/.*/other/' | sort | uniq -c | sort -rn
git log --format=%ad --date=short $CUT | sort -u | wc -l   # dias_con_commits
git rev-list --max-parents=0 --count $CUT                   # commits_raiz: el commit a618764
prev=a618764
for tip in ec4d6f1 f4ab8a5 6d339fa 89ba9ac 3575f90 c11ab61; do
  echo "$tip $(git rev-list --count $prev..$tip)"; prev=$tip
done                                                         # commits por fase
git grep -h -E '^duration:' $CUT -- '.planning/phases/*/*-SUMMARY.md' | wc -l   # summaries_con_duracion
node scripts/check-figures.mjs --tests                      # recalcula todo el bloque
```

Los rangos por fase empiezan en el commit raíz `a618764` y lo dejan fuera, así que se cuenta aparte: los rangos por fase más el commit raíz dan `commits_total`. El script recalcula cada valor del bloque anterior, comprueba esa suma y falla si alguno no coincide.
