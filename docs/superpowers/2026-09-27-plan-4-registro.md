# SDD ledger — plan: docs/superpowers/plans/2026-09-27-silabin-trazo.md

Ledger versionado del Plan 4 (modelo: `2026-09-26-plan-3-registro.md`). Busca `Ruling` para las
decisiones tomadas sin consultar y `minor (deferred)` para lo que se dejó sin arreglar.

Spec: docs/superpowers/specs/2026-09-27-trace-design.md (autoridad en `trace`; D12-D17), sobre docs/superpowers/specs/2026-09-18-silabin-design.md
Rama: feat/plan-4-trace (desde main en 8f51a2c)
Plan escrito con Opus 5.5 el 2026-09-27. Ejecución: coordinador en Sonnet (puerta de modelo del CLAUDE.md). Implementadores y revisores de tarea: `model: "sonnet"`. Revisión final: opus.
Briefs/reportes/diffs (desechables): `.superpowers/sdd/2026-09-27-silabin-trazo/`. Briefs con `sed -n A,Bp` (el plan usa «Tarea N»).

## Decisiones con el autor (2026-09-27)

D12 se evalúa solo la forma (cobertura por trazo + precisión, tolerancia generosa), sin orden ni dirección.
D13 nivel de guía según la caja Leitner (0 → 1, 1 → 2, 2-3 → 3); el nivel 3 conserva un carril muy tenue.
D14 la Fase 1 se desbloquea en el Plan 5, con `say-it`; nada provisional en el planificador.
D15 R29: con 2 opciones la pista 1 solo repite el audio; el nivel fácil sigue con 2.
D16 solo mayúsculas; las minúsculas y `lowercaseTracing`, en el Plan 6.
D17 el trazo entra por `submitTrace` y lo puntúa el motor; SVG con eventos `pointer`.
(La numeración sigue la tabla D1-D11 del README; la «D12» del registro del Plan 3 era interna de aquel plan.)

## Hallazgo al escribir el plan

Prototipo desechable de la puntuación con los trazos de la Tarea 1 y las constantes de partida (0.15 / 0.75 / 0.8): las 9 letras pasan con sus trazos y con temblor ±0.08; pasan también 5 pares cruzados (E sobre S, E sobre P, S sobre E, O sobre U, U sobre O). Con tolerancia 0.10 solo U sobre O. Cerca del umbral, pero fallan: E sobre O, L sobre I, S sobre O, P sobre S. El plan los fija en `CONFUSABLE_PAIRS` (G15) y la prueba manual de la Tarea 5 decide si se mueven las constantes.

Márgenes medidos a 0.15 / 0.75 / 0.8 (cobertura mínima / precisión): las 9 letras con temblor ±0.08, 1.000 / 1.000 todas. Pares fuera de la lista más cerca de pasar: L sobre I 1.000 / **0.780** (el más frágil, a 0.02); E sobre O 0.720 / 0.784; P sobre S 0.700 / 0.849; E sobre L 1.000 / 0.705; S sobre P 0.804 / 0.700. Si la implementación da L sobre I como aprobado, primero se compara el remuestreo con el del plan.

## Revisión del plan por el advisor (Opus, 2026-09-27)

Plan sólido; cuatro ajustes aplicados antes de ejecutar: (1) los márgenes de arriba, que se habrían perdido con el scratchpad; (2) X3 de R29 incluye un ítem oral de `phase0:initial` (3 opciones del dato, verificado en `phase0.ts:82` y en `buildOptions`), la única unidad jugable hoy; (3) la prueba manual de la Tarea 5 añade `allowedDevOrigins` desde `DEV_ORIGINS` en `next.config.ts`, porque Next 16 bloquea en desarrollo los orígenes de la red local y la página no se hidrataría en el móvil; (4) Tarea 2: M4 de `answers.test.ts` llama a `checkAnswer` directamente y no cambia; C5 exige el mensaje nuevo de `submitAnswer` a propósito.

## Estado

Plan escrito, committeado y aprobado por el autor (2026-09-27). Siguiente: Tarea 1, en una sesión nueva con `/model sonnet`.
