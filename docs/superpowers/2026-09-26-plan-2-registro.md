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
Task 4: fix round 1/2 (3 addressed, 0 open — S9 vacuo ante el doble crédito, S5 sin valor del reloj, `retrySave` tautológico; commits 6e00b0f..65c92ec; re-revisión verificó dos de las mutaciones en copia aparte)
Task 4: complete (commits 900fef7..65c92ec, review clean tras 1 ronda; 5/5 mutaciones del brief y 15 propias, 3 supervivientes equivalentes; el revisor probó 19 más, los 4 supervivientes útiles ahora muertos)
Task 4: minor (deferred): `app-store.test.ts` «abandonar restaura progress desde el documento» exagera lo que comprueba: pasa aunque `abandonSession` no restaure `progress` (equivalente hoy por el invariante `run.progress == toProgress(doc)`); renombrar.
Task 4: minor (deferred): `app-store.ts` `guardar`: con dos guardados en vuelo, un fallo antiguo puede pisar un `saveFailed: false` más nuevo (el disco queda bien, solo el aviso); un contador de secuencia lo cerraría.
Task 4: minor (deferred): la guarda `isSessionOver` de `endSession` duplica la de `finishSession` (inocua, hace explícito el contrato); `beginSession`/`answer`/`presentationDone` no comprueban `status === "loading"` (no especificado).
Task 4: minor (deferred): los tests del puente se pasaron a verde antes de verificar el rojo (se comprobó después quitando el fichero); sin efecto duradero, las mutaciones M1-M3 los matan.

Corte de sesión 2 tras la Tarea 4 (T3 y T4 en la sesión). Siguiente sesión: «Retoma el Plan 2 desde el ledger» y sigue con la Tarea 5 (rango del plan 406-484; brief ya extraído en `.superpowers/sdd/2026-09-26-silabin-sesion/task-5-brief.md`), modelo Sonnet. Interfaces de T4 disponibles: `toProgress`, `withProgress`, `appendSession`, `unlockRewards`, `createAppStore`, `AppState`, `AppStoreDeps` (sin barril `store/index.ts` hasta la Tarea 6, Ruling R2). Recordatorio de R6: `checkAnswer` lanza para `trace`/`say-it`; anotar como trampa en el README al cerrar el plan.

Task 5: fix round 1/2 (5 addressed, 0 open — cola colgada si `onend` no llega (guarda con `setTimeout` + referencia viva), huecos M-guard y M-tail, reentrancia de `stop()` desde `onSegment`/`beat`, contrato de `onSegment` documentado; commits 75f07ea..30adbcf)
Task 5: complete (commits 281f90f..30adbcf, review clean tras 1 ronda; 17 mutaciones del implementador y 9 del re-revisor muertas salvo `current = utterance`, equivalente porque el GC no es observable). `AudioPlayer.beat()` según R3.
Task 5: Ruling R7: la tabla de `imageFor` cubre las 65 claves `img:` del currículo (35 de `pictures.ts` + 30 de la Fase 2), no las 35 del brief — I1 exige toda `imageKey` de `curriculum.items` — si fuera equivocado, sobran 30 entradas de una tabla provisional.
Task 5: minor (deferred): `createSilentPlayer` y `synth` indefinido no llaman a `onSegment`; la UI (T7/T8) no debe depender de él para avanzar (documentado en `types.ts`).
Task 5: minor (deferred): el listener de `voiceschanged` no se quita y `AudioPlayer` no tiene `dispose`; documentar «un reproductor por aplicación» o añadir `dispose` cuando lo consuma la UI (T6/T7).
Task 5: minor (deferred): `speech-player.ts` `startsWith("es")` aceptaría códigos de tres letras que empiecen por «es»; mejor `=== "es" || startsWith("es-")`.
Task 5: minor (deferred): emoji de Unicode 13/15 (🪽 🫏 🫓 🫖 🛖) pueden salir como cuadrado en Android/Windows antiguos; `👎` (mala) y `😠` (malo) rozan el principio «sin mensajes negativos»; `🍼` para «pipa» dudoso; I1 usa `>= 35` y no detecta entradas huérfanas. Provisional hasta que haya imágenes reales.
Task 5: minor (deferred): `current` en `speakOne` es de solo escritura a propósito (retiene la utterance contra el GC); añadir un comentario que lo diga para que nadie lo borre por muerto.

Sesión 3: T5 cerrada (1 tarea en esta sesión). Siguiente: Tarea 6 (rango del plan 485-585, brief en `.superpowers/sdd/2026-09-26-silabin-sesion/task-6-brief.md`); aplica R2 (barril `src/store/index.ts`, `boundaries.test.ts`).

Task 6: fix round 1/2 (2 addressed + R8, 0 open — `isSessionPlayable` no exigía las plantillas de los ítems de repaso, panel de `SaveWarning` que reaparecía solo, aserción del toque corto y `revokeObjectURL` diferido; commits f119219..3e5001d)
Task 6: complete (commits f023a07..3e5001d, review clean tras 1 ronda; 3 mutaciones del brief, 8 propias del implementador y 3+3 de los revisores muertas)
Task 6: Ruling R8: con unidad activa, `isSessionPlayable` exige las plantillas de `[activa] ∪ unidades con algún ítem presentado` (no solo las de la activa), porque el planificador elige la plantilla de un ítem de repaso con `pickTemplate(owner, …)`, donde `owner` es la unidad que lo introdujo — más estricto que el brief (que decía «las que declara la activa»), en la dirección segura; si fuera equivocado, una unidad activa saldría atenuada sin necesidad al faltar la plantilla de una unidad anterior con ítems presentados. Los tests U6 no cambian.
Task 6: Ruling R9: el `open` de `SaveWarning` (Minor del revisor) entró en la ronda porque un diálogo a pantalla completa que reaparece solo sobre el niño roza el principio de no interrumpir — si fuera equivocado, cuesta dos líneas.
Task 6: minor (deferred): objetivo táctil del icono de `SaveWarning` de ~36 px (<44) y panel sin `aria-modal` ni gestión de foco.
Task 6: minor (deferred): con solo `recovered`, «Reintentar» no cambia nada visible porque el store no limpia `recovered` (asunto de la Tarea 4).
Task 6: minor (deferred): `boundaries.test.ts` no detecta `require(...)`; el test del nombre del fichero de exportación no discrimina fecha local de UTC con `TZ=UTC`.
Task 6: concern para T7/T8: `vitest.config.ts` sigue en entorno `node`; cada test de UI necesita el docblock `// @vitest-environment jsdom`. `App` acepta `store?`/`audio?` para inyectarlos; `test-support.tsx` (en `src/features/`, importa `vitest`) solo lo usan los tests. La pantalla `"session"` de `Screens` en `src/features/App.tsx` es un stub con «Volver al mapa»: la Tarea 7 lo sustituye; la pantalla `"end"` existe en el tipo y nada la usa. `templateViews` está vacío hasta la Tarea 8. Hueco pendiente: `createIdbAdapter`, `createSpeechPlayer` y `downloadInBrowser` reales solo se comprobaron a mano con `pnpm dev` (Chromium).

Corte de sesión 3 tras la Tarea 6 (T5 y T6 en la sesión). Siguiente sesión: «Retoma el Plan 2 desde el ledger» y sigue con la Tarea 7 (rango del plan 586-639; brief ya extraído en `.superpowers/sdd/2026-09-26-silabin-sesion/task-7-brief.md`), modelo Sonnet. Respeta R2, R3 (`beat()` ya está en `AudioPlayer`, la T8 lo usa en cada toque), R8 y el concern de arriba. Recordatorio de R6 para el README al cerrar el plan.
