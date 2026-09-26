# SDD ledger — plan: docs/superpowers/plans/2026-09-26-silabin-sesion.md

Ledger versionado del Plan 2 (modelo: `2026-09-19-plan-1-registro.md`). Busca `Ruling` para las
decisiones tomadas sin consultar y `minor (deferred)` para lo que se dejó sin arreglar.

Spec: docs/superpowers/specs/2026-09-18-silabin-design.md (autoridad; el plan cita §2, §4, §5, §8, §9)
Rama: feat/plan-2-sesion (desde main en 7ca3350; HEAD al empezar 61cfcac)
Coordinador: Sonnet 5 (puerta de modelo pasada). Implementadores y revisores de tarea: sonnet. Revisión final: opus.
Briefs/reportes/diffs (desechables): `.superpowers/sdd/2026-09-26-silabin-sesion/`. Los briefs se extraen con
`sed -n A,Bp` porque el plan usa «Tarea N» y `scripts/task-brief` busca «Task N».

Rangos del plan: T1 132-187 · T2 188-244 · T3 245-331 · T4 332-405 · T5 406-484 · T6 485-585 ·
T7 586-639 · T8 640-702 · T9 703-721.

## Escaneo previo (conflictos entre tareas)

| Par / tarea | Qué produce vs consume | Hallazgo |
|---|---|---|
| T1 → T3, T6-T8 | barril `@/engine` podado + reexports | limpio: T3 importa de módulos internos, la interfaz solo del barril |
| T1 ↔ T2 | ambas tocan `planner.ts` (`basePool` / `planSession`) | limpio: secuenciales, T2 reutiliza `templatesFor`/`basePool` |
| T1 → T8 | `oral:clap:*.syllables` | limpio: `Item.syllables` ya es opcional en `content/types.ts:27` |
| T2 → T3, T4 | `SessionLogEntry`, `unitId` nullable | limpio |
| T3 → T4 | `SessionRun`, `submitAnswer`, `finishSession` | **ambiguo**: T3 dice «calcula `unitId` y recalcula `units` antes de planificar» sin fijar el orden → Ruling R1 |
| T4 → T6 | `AppState`, `createAppStore`, `createIdbAdapter` | **conflicto**: T6/U8 prohíbe a `features/` importar `@/store/persist`, pero `App` necesita `createIdbAdapter` y el test U5 necesita `importState` → Ruling R2 |
| T5 → T7, T8 | `AudioPlayer`, `AudioRequest` | **hueco**: T8 dice que cada toque «suena `beat`», pero `beat` no es clave del manifiesto (A9 hace rechazar claves desconocidas) y `AudioPlayer` no tiene golpe suelto → Ruling R3 |
| T6 → T7, T8 | `PresentationProps`, `EvaluationProps`, `templateViews`, `IMPLEMENTED_TEMPLATES` | nota: entre T6 y T8 `count-syllables` figura implementada sin vista registrada; T7 (paso 5) lo cubre con el retorno al mapa y nada se integra a `main` en medio. Sin ruling |
| T7 ↔ T8 | `attemptKey`, `locked`, `feedback.hint`/`resolution` | limpio: `assisted` trae `hint` (modelo) y `resolution`, coherente con `recordAttempt` |
| T7, T8 → T4 | `REWARDS` en `EndScreen` | limpio: `REWARDS` sigue en el barril |
| T9 | README | limpio |
| Autoconsistencia T1-T9 | tests contra código contra ficheros | T1: T1.2 exige un invariante ejecutable sobre un currículo de prueba → la comprobación debe vivir como función en `invariants.ts` (Ruling R4, menor). Resto: limpio |

## Rulings previos a la ejecución

- Ruling R1: en `startSession` el orden es `recomputeUnitStatuses` → `activeUnitId` → `planSession` — el plan enumera «calcula unitId» primero pero la trampa 1 del README exige unidades recalculadas antes de decidir cuál está activa — si fuera equivocado, una sesión de un documento viejo podría planificar sobre una unidad que ya no está activa.
- Ruling R2: se crea `src/store/index.ts` (barril: `createAppStore`, tipos `AppState`/`AppStoreDeps`, `createIdbAdapter`, `createMemoryAdapter`, `StorageAdapter`, `importState`) en la Tarea 6, y `boundaries.test.ts` prohíbe a `features/` y `components/` todo import `@/store/<módulo>` (no solo persist y schema) además de `@/content` y `@/engine/…` — la regla del plan es contradictoria con lo que `App` necesita, y el barril mantiene su intención (interfaz sin acceso a esquema ni a persistencia cruda) — si fuera equivocado, cuesta un barril de 10 líneas.
- Ruling R3: `AudioPlayer` gana `beat(): void` (golpe suelto y síncrono, sin cola; `createSilentPlayer` lo deja como no-op) en la Tarea 5, y la Tarea 8 lo usa en cada toque del tambor en vez de una petición `play({key:"beat"})` — el golpe por toque tiene que ser inmediato y no puede pasar por la cola ni por el manifiesto — si fuera equivocado, se cambia una línea en la interfaz y su uso.
- Ruling R4: el invariante «toda unidad tiene plantilla para sus ítems» se implementa como función exportada en `src/content/invariants.ts` y se llama desde `invariants.test.ts` con el currículo real y con uno de prueba (T1.2) — sin eso T1.2 no puede demostrar que el invariante falla — si fuera equivocado, mover una función.
- Ruling R5 (previsible, del plan): el mapa decide jugabilidad, no pedagogía; `abandonSession` no cuenta la sesión, conserva el crédito ya aplicado y reutiliza el índice de sesión (sin doble crédito, S9).

## Progreso

(Task <N>: complete … se añade aquí al cerrar cada tarea)

Task 1: complete (commits 67025a0..d8f1dd2, review clean; 4/4 mutaciones del plan y 6 propias muertas)
Task 1: minor (deferred): `invariants.test.ts:61-92` T1.2 usa una unidad con un ítem; un invariante que solo mire el primer elemento de `introduces` sobrevive (añadir un segundo ítem malo).
Task 1: minor (deferred): el mensaje del commit dice que T1.1 falla por las unidades de Fase 2; en realidad falló primero por la función inexistente (la mutación 2 demuestra que las detecta).

Task 2: fix round 1/2 (3 addressed, 0 open — «vencidos primero» y desempate por lastSessionIndex sin test que discriminara, título de test engañoso; commits a87b713..9f623aa)
Task 2: complete (commits 9c630db..9f623aa, review clean tras 1 ronda; 4/4 mutaciones del plan y 6 propias muertas, las 2 supervivientes ahora muertas)
Task 2: minor (deferred): `planner.ts:516-553` `planReviewOnly` repite ~30 líneas de `makeExercise` (nivel de distractor, buildOptions, contador de id); si cambia la regla del nivel, los dos modos divergen. Candidato a extraer en una limpieza.
Task 2: minor (deferred): ningún test de modo normal cubre la eliminación del desempate `lastSessionIndex` del comparador compartido (solo lo cubre el test nuevo de repaso).
Task 3: complete (commits 3845109..cfbe0bd, review clean a la primera; 5/5 mutaciones del brief y 17 propias, 3 supervivientes equivalentes; el revisor probó 13 más, 4 supervivientes menores/equivalentes)
Task 3: Ruling R6: `checkAnswer` lanza para ítems de trazo y voz (`trace`, `say-it`) tal como manda el brief, y no se añade ninguna guarda en la Tarea 3 — el plan solo construye `count-syllables` y la única unidad activa hasta terminar Fase 0 es `phase0:clap`, que no planifica esas plantillas; ninguna tarea posterior las menciona — si fuera equivocado, un niño que llegue a las unidades de letras (o a una sesión de solo repaso con ítems de letras) toparía con una excepción a mitad de sesión. Va al README como trampa al cerrar el plan y la revisión final debe confirmarlo.
Task 3: minor (deferred): `session.test.ts` no comprueba que `startSession` respete `seed` (forzar `seed: 0` sobrevive); comprobar si `planner.test.ts` ya cubre el determinismo.
Task 3: minor (deferred): ningún test aserta `masteredAt === now` tras alcanzar dominio (sustituir `now` por `''` en `applyResolution` sobrevive) ni el orden de `run.resolutions` (anteponer en vez de añadir sobrevive; `starsForSession` no depende del orden).
Task 3: minor (deferred): un plan de 0 ejercicios (sin unidad activa y sin ítems vistos) hace `isSessionOver` verdadero al empezar y `finishSession` registra 0 estrellas e incrementa `sessionCounter`; la interfaz (T7/T8) no debe mostrar resumen de una corrida vacía.
Task 4 (siguiente): interfaces de T3 disponibles desde `@/engine`: `SessionRun`, `startSession`, `submitAnswer`, `finishSession`, `SessionSummary`. Sesión 2: 1 tarea hecha (T3).

Corte de sesión 1 tras la Tarea 2 (2 tareas en la sesión). Siguiente sesión: «Retoma el Plan 2 desde el ledger», modelo Sonnet.
