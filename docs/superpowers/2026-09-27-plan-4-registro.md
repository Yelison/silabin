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

## Estado

Plan escrito y committeado. Siguiente: Tarea 1, en una sesión nueva con `/model sonnet`.
