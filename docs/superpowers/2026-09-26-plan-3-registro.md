# SDD ledger — plan: docs/superpowers/plans/2026-09-26-silabin-plantillas-toque.md

Ledger versionado del Plan 3 (modelo: `2026-09-26-plan-2-registro.md`). Busca `Ruling` para las
decisiones tomadas sin consultar y `minor (deferred)` para lo que se dejó sin arreglar.

Spec: docs/superpowers/specs/2026-09-18-silabin-design.md (autoridad; el plan cita §2, §4, §5, §9)
Rama: feat/plan-3-plantillas-toque (desde main en e1b5af9)
Plan escrito con Opus 5.5 el 2026-09-26. Ejecución: **coordinador en Opus por decisión del autor (2026-09-26), como experimento para medir tokens; la puerta de modelo del CLAUDE.md queda exenta en este plan y no debe parar la sesión.** Implementadores y revisores de tarea: `model: "sonnet"`. Revisión final: opus.
Medición: al cerrar cada sesión de ejecución, el autor apunta el uso que marca Claude Code; el coordinador lo registra aquí como `Tokens sesión N:` junto a las tareas hechas en ella.
Briefs/reportes/diffs (desechables): `.superpowers/sdd/2026-09-26-silabin-plantillas-toque/`. Briefs con `sed -n A,Bp` (el plan usa «Tarea N»).

## Decisiones con el autor (2026-09-26)

D8 base visual mínima dentro del Plan 3 (tokens + componentes; el autor pidió investigar el diseño para niños: resumen en el plan y en `docs/diseno-visual.md`, T1).
D9 `importState` al Plan 6: un import deliberado sustituye `doc` y quita `readFailed`/`recovered`.
D10 las 5 plantillas; tras el plan solo la Fase 0 es jugable (Fase 1 y 2 declaran trace y say-it); `listen-tap` y `build` se ven en `/dev/plantillas`.
D11 la prueba manual del Plan 2 (`pnpm dev`) la hace el autor ANTES de despachar la Tarea 1.

## Hallazgo al escribir el plan

`build` no tiene opciones y los ítems `syllable` no llevan `task`: `checkAnswer` lanzaría a mitad de un ejercicio de build (trampa 9 en otra forma). La Tarea 2 lo cierra con `expectedAnswer` y el invariante M11.

## Estado

Plan escrito; ninguna tarea despachada.
D11 cumplida (2026-09-26): el autor probó con `pnpm dev` en Edge y Chrome (Windows, WSL2): sesiones, pistas y guardado bien (lo comprobó con la exportación o IndexedDB, porque el mapa no enseña nada hasta completar la unidad). Única incidencia: en Edge la pausa entre sílabas es mucho más larga («ga ····· to») por la latencia de las voces «Natural» de red; en Chrome no pasa. Añadida a la Tarea 1 (casos A15-A21). No probado en iPhone/iPad.
Tras la prueba, la Tarea 1 lleva tres partes con commits separados: base visual, elección de voz (A8-A14) y pausa entre sílabas (A15-A21). El coordinador puede despachar las dos de audio como un segundo implementador dentro de la misma tarea, con su propia revisión completa.
minor (deferred) para el Plan 6: el mapa no enseña ningún avance hasta completar una unidad (5-6 sesiones en `phase0:clap`); ni el niño ni el adulto ven que se guarda.
