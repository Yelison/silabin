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

## Ejecución con Subagent-Driven Development (2026-09-27, coordinador en Sonnet)

Puerta de modelo verificada: sesión en Sonnet. Espacio de trabajo desechable:
`.superpowers/sdd/2026-09-27-silabin-trazo/` (solo tenía `plan-path` de cuando se escribió el plan).

**Escaneo previo a la Tarea 1** (tabla, no veredicto):

| Par / tarea | Comprobado | Resultado |
|---|---|---|
| T1 → T2 (interfaz) | T2 «Consumes (T1)»: `scoreTrace`, `guideLevel`, `glyphFor`, `TraceStroke`, `GuideLevel`, `Glyph` contra lo que T1 «Produces» | coincide exactamente en nombres y firmas |
| T1 consigo misma (G17) | El invariante habla de «unidad que declara `trace`»; `phase1.ts` (vocales) y `phase2.ts` (m,l,s,p) ya declaran `templateId: "trace"` en sus `exercises` | las 9 letras de la tabla de trazos (A,E,I,O,U,M,L,S,P) son exactamente los `letter:*` que esas unidades introducen; el invariante no es vacío |
| T1 consigo misma (glyphFor / claves) | `UPPER_GLYPHS` se indexa por `item.text`; `letter:a`…`letter:u` (phase1) y `letter:m/l/s/p` (phase2) tienen `text` en minúscula de una letra | coincide |
| Usos de `glyphFor`/`scoreTrace`/`guideLevel` en el resto del plan (T2-T4) | `grep` de las tres firmas en todo el plan | ningún uso diverge de la firma de T1 |

Escaneo limpio para la Tarea 1 y su consumidor inmediato (T2). No se leyeron las Tareas 3-5 en profundidad: el advisor ya revisó el plan completo el 2026-09-27 (ver arriba) y esta sesión solo despacha la Tarea 1.

**Tarea 1 — implementación:** commit `1045f20` (feat(engine): puntuar el trazo por forma, con
tolerancia, para no frustrar a quien empieza). `pnpm test` 844 pasan / 1 skip, typecheck y lint
limpios. G15 confirma los 5 pares previstos (E→S, E→P, O→U, U→O, S→E) y ninguno nuevo — sin
`Ruling` R30 necesario, la lista prevista se sostiene tal cual.

**Tarea 1 — revisión (ronda 0, sonnet):** ✅ cumplimiento del spec (geometría, constantes,
algoritmo, `guideLevel`, G1-G17, G15/`CONFUSABLE_PAIRS` todo verificado con ejecución
independiente, no solo lectura). **Needs fixes** — 3 Important, 0 Critical:
1. Duplicación literal de `resampleForTest`/`withTremor` entre `glyphs.test.ts` y
   `trace.test.ts` (más una tercera versión interna en `trace.ts`) — code quality.
2. El informe de la mutación 2 (distancia al punto más cercano) subcuenta los tests que
   rompen: dice 7, el revisor verificó por ejecución que son 8 (faltan G1, G2, G12, G14).
   Veredicto "detectada" correcto, cifra incorrecta.
3. El informe de la mutación 3 (sin precisión) subcuenta los pares nuevos en G15: dice 3
   (s>l, s>p, p>i), el revisor verificó por ejecución que son 12. Veredicto "detectada"
   correcto, alcance mal representado.
Minor (deferred): G5 (dedo rápido, solo 2 extremos) es matemáticamente idéntico a G1 para la
`L` sintética del brief — no ejercita distancia-al-segmento de forma distinta a G1 con esta
fixture; queda anotado, no bloquea.
Mutación 5 (remuestreo sin arrastre entre segmentos) — confirmada que sobrevive por ejecución
independiente del revisor, no solo por el informe del implementador. Es la debilidad conocida
y aceptada del brief para estas 9 letras con `TOLERANCE=0.15`; no se pide test nuevo.

Fix round 1/5: se resume al implementador original (mismo agente, sonnet) con los 3 Important
verbatim.

**Tarea 1 — fix round 1/5 (commits 1045f20..24b017b):**
1. Duplicación de `resampleForTest`/`withTremor` → arreglada: `src/engine/trace-test-fixtures.ts`
   nuevo, importado desde ambos test files; `git show` confirma `trace.ts` de producción
   idéntico al commit anterior.
2. Cifra de la mutación 2 → el implementador discrepó del primer revisor (7 tests rotos, no 8;
   G12 no detecta esta mutación porque compara la misma función mutada contra sí misma sobre
   una entrada que, tras filtrar no-finitos, queda estructuralmente idéntica). La re-revisión
   reimplementó el algoritmo en un script aislado y confirmó de forma independiente al
   **implementador**: 7 bloques (G1, G2, G5, G7, G9, G11, G14), G12 pasa. El primer revisor se
   equivocó en su propia reproducción. Cuarta vez en este proyecto que un informe honesto de
   un implementador corrige a quien le dio las instrucciones (ver CLAUDE.md, «modo económico»).
3. Cifra de la mutación 3 → confirmada sin cambios: 12 pares nuevos, coincide con las tres
   partes.
Re-revisión (sonnet): los 3 hallazgos ADDRESSED, sin rotura nueva. Minor (deferred):
`trace-test-fixtures.ts` vive en `engine/` sin sufijo `.test.ts` (no rompe nada, vitest no lo
recoge como spec); considerar moverlo a una carpeta de test-utils si se vuelve a tocar.

Tarea 1: complete (commits cd4403f..24b017b, fix round 1/5, review clean tras la ronda).

## Estado

Plan escrito, committeado y aprobado por el autor (2026-09-27). Tarea 1 completa. Siguiente:
Tarea 2, «Contrato de sesión y store» (líneas 236-308 del plan).
