# Plan 5 — registro

Plan 5 = voz: `say-it` y `read-word` con el evaluador `parent` pulido, captura con
`getUserMedia` y desbloqueo de la Fase 1 (D14). Rama `feat/plan-5-voz` (desde `main` tras
fusionar el PR #5).

## Estado

**Fase: ejecución (2026-09-28). Tareas 1-4 completas; siguiente, Tarea 5.**
Plan: `docs/superpowers/plans/2026-09-28-silabin-voz.md`, 7 tareas. Ejecutar con
`/model sonnet` y `superpowers:subagent-driven-development`, en sesiones de 2-3 tareas.

| Tarea | Contenido | Riesgo | Estado |
|---|---|---|---|
| 1 | `*.test.tsx` en jsdom (trampa 8), trampa 4 por test | configuración | **completa** (e91db39, revisión limpia) |
| 2 | `submitSpeech`, D19 en el motor, `syllablesVoiced`, `hideMic`, invariante de la trampa 9 | motor/store, mutaciones | **completa** (fefe69f, 1229fbe) |
| 3 | `speech/`: VAD, captura, evaluador `parent`, `pickEvaluator` | lógica nueva, mutaciones | **completa** (0b82285, 9c19e0c) |
| 4 | `Mouth`, `MicButton`, `VoiceTurn` | interfaz con estado, mutaciones | **completa** (c966a90, 5132eb2, 3a6a6c9) |
| 5 | `say-it` de punta a punta (desbloquea la Fase 1) | contrato, mutaciones | pendiente |
| 6 | `read-word` (desbloquea la Fase 2), D19 en la vista, `/dev/plantillas` | contrato, mutaciones | pendiente |
| 7 | Integración, deuda 4, README y poda, lista de la prueba manual | tests/docs | pendiente |

Rulings de planificación: P1-P15, en la sección «Decisiones» del plan. Los más delicados son
P1 (`parent` = siempre `unsure`), P2 (cada «Otra vez» avanza la pista), P4 (2 silencios →
botones), P11 (corrige `first-syllable-voice`) y P12 (D19 también en el modelo).

## Decisiones tomadas con el autor (2026-09-27)

| # | Decisión |
|---|---|
| D19 | **Toque accidental en `trace`:** se ignora. Si la tinta total es mínima (umbral a fijar en el plan, orientativo < 10 % de la longitud de la letra), se borra sola y no cuenta intento ni gasta pista. Coherente con «sin habla detectada → no cuenta intento» de la voz. Cierra la decisión abierta del Plan 4 (registro del Plan 4, revisión final, «Important #3») |
| D20 | **VAD por umbral de energía**, no Silero: `getUserMedia` + `AnalyserNode`; corta a 3 s o a 600 ms de silencio tras habla. Sin dependencias nuevas. Silero llega con el evaluador `browser`/`azure` |
| D21 (2026-09-28) | **Boca de la pista 1 de `say-it`:** SVG esquemático con pocas posiciones por fonema (abierta, redonda, estirada, labios cerrados…) más la instrucción repetida. Placeholder como D8; el Plan 6 lo sustituye |
| D22 (2026-09-28) | **Desbloqueo:** el Plan 5 deja jugables la Fase 1 **y** la Fase 2. Incluye sustituir la inyección de `build/SessionFlow.test.tsx` (deuda 4) |
| D23 (2026-09-28) | **«Ocultar micrófono» y `speechMode`:** entran en el store con su valor por defecto y se respetan con tests, sin interfaz (`hideMic` lo leen las vistas y `speechMode` lo lee `speech/`; ninguno entra en `engine/`, P9 del plan). La interfaz llega con el panel de padres (Plan 6) |

## Puntos que el plan debe recoger (sin pregunta pendiente)

4. **Trampa 9:** `say-it` y `read-word` necesitan su propio camino de evaluación (como
   `submitTrace`, D17), p. ej. `submitSpeech(verdict)`; el veredicto lo da el evaluador y el
   motor aplica pistas. Proponer en el plan.
5. **Conversiones de trampas a incluir en el plan** (regla de poda de `CLAUDE.md`, primera
   poda hecha el 2026-09-27): trampa 8 → `*.test.tsx` en jsdom desde `vitest.config.ts`;
   trampa 4 → `no-restricted-imports` de módulos internos de `engine/` desde
   `features/`/`components/`; trampa 9 → camino de evaluación de voz más un invariante que
   falle si una plantilla de una unidad jugable no puede evaluarse. Además, deuda 4 del README:
   sustituir la inyección de `build/SessionFlow.test.tsx` al hacerse jugable la Fase 2.
6. Rung 3 de voz: se acepta con solo detectar habla (spec §5); sin habla → «No te oí» sin
   contar intento.

## Ejecución

- Tarea 1: complete (commits 0e9cedd..e91db39, revisión de cumplimiento limpia, sin mutación).
  Mecanismo: `test.projects` inline con `extends: true` (`node` para `*.test.ts`, `jsdom` para
  `*.test.tsx`). C3 ya existía en `src/engine/index.test.ts` (`PODADOS`), no se duplicó.
- Ruling: la cifra de partida de la Tarea 1 era 912 + 1 omitido, no 900 (el plan estaba
  desactualizado) — la aceptación es «idéntico más los centinelas»: 914 + 1 tras C1 y C2 —
  si fuera equivocada, solo habría que corregir el número en el plan.
- Tarea 1: minor (deferred): el comentario de `vitest.config.ts:52` no menciona que el `.ts`
  va a `node` de forma explícita; no urge.
- Nota de proceso: el script `task-brief` del skill busca «Task N» y el plan usa «Tarea N»;
  los briefs se extraen a mano con `sed -n` sobre las líneas de cada tarea.
- Tarea 2: fix round 1/2 (1 addressed, 0 open — la metacomprobación de `evaluable.test.ts`
  exigía solo `voz > 0`, así que saltarse `read-word` no fallaba; ahora exige visitas por
  plantilla; commits fefe69f..1229fbe).
- Tarea 2: complete (commits 901dffb..1229fbe, review clean tras 1 ronda). 19 mutaciones del
  implementador + 11 del revisor; las dos que sobrevivieron (saltar `read-word`, y
  `stripDiacritics` en `firstSyllableAudioKey`) se cerraron o quedan como minor.
- Tarea 2: minor (deferred): `stripDiacritics(first)` en `engine/answers.ts:76` no lo cubre
  ningún test (equivalente con el contenido actual: ninguna primera sílaba lleva tilde); si se
  quiere blindar, un ítem sintético con `syllables: ["má","ma"]`.
- Ruling: los cambios de tests existentes por D19 (`session.test.ts` TRAZO_MALO, `app-store.test.ts`
  C9 y 2 usos de `onTrace([])` en `SessionScreen.test.tsx`, este último fuera de la lista de
  ficheros de la tarea) se aceptan: un trazo vacío ya es `ignored` por diseño y los sustitutos
  son trazos con tinta lejos de la letra, que siguen ejerciendo el camino de fallo — si fuera
  equivocado, se debilitaría la cobertura del fallo real de `trace`.
- Nota de proceso: el implementador escribió la implementación antes de ver el RED; lo
  verificó después con `git stash` (28 fallos). Sin consecuencia en el resultado.
- Tarea 3: fix round 1/2 (1 addressed, 0 open — un aborto durante `await ctx.resume()` se perdía y
  dejaba el micrófono abierto hasta 3 s (P6); ahora el listener de `abort` se registra en cuanto hay
  micrófono y `resume` va en `Promise.race` contra la cancelación; commits 0b82285..9c19e0c).
- Tarea 3: complete (commits 7d9f91f..9c19e0c, review clean tras 1 ronda). 18 mutaciones del
  implementador (2 equivalentes: `runMs` no se usa tras `heard`) + 7 del revisor + 4 sobre el
  arreglo; la única que sobrevivió (aborto durante `resume`) era el defecto real y se cerró.
  984 pasan + 1 omitido antes de la corrección; tras ella, 44 en los ficheros de `speech/`.
- Tarea 3: minor (deferred): sin `AudioContext` en el navegador, `createMicListener` devuelve
  `unavailable/error` (no `no-api`) y solo después de abrir el micrófono (`capture.ts`, comprobarlo
  antes de `getUserMedia` lo arreglaría; el `finally` ya lo deja cerrado).
- Tarea 3: minor (deferred): S15 solo cubre `letter:a`; `speechTarget` copia `item.text` y
  `item.phonemes` sin adaptar. **La Tarea 4 debe confirmar qué `text` espera el reconocedor para
  sílabas y palabras** (solo importa con `browser`/`azure`, no con `parent`).
- Tarea 3: minor (deferred): el test «aborto con `resume` pendiente y luego liberado» promete más de
  lo que ejerce (`listen` ya resuelve `aborted` al hacer `abort()`, antes de liberar el `resume`).
- Tarea 3: minor (deferred): comportamiento real de `AudioContext` en Safari/iOS (`suspended`,
  `webkitAudioContext`) solo se verá en la prueba manual con dispositivo (D11).
- Nota de proceso: S16 quedó en `src/features/speech-context.test.tsx` (importa de `features/`, y
  `speech/` corre en node). El implementador citó un SHA erróneo (0dc0a5e) para la corrección; el
  real es 9c19e0c.
- Tarea 4: fix round 1/2 (3 addressed, 0 open — (1) un `heard` con `disabled=true` se descartaba
  dejando el turno atrapado en `attempt` y en `model`; (2) un evaluador que nunca resuelve dejaba
  al adulto sin botones (P4); (3) faltaba el test de evaluación tardía tras desmontar; commits
  5132eb2..3a6a6c9).
- Tarea 4: complete (commits 425b04c..3a6a6c9, review clean tras 1 ronda). 28 mutaciones del
  implementador + 13 del revisor + 11 sobre la corrección; sobrevivieron y se cerraron con tests:
  silencios sin reinicio tras veredicto, botón del adulto sin abortar la escucha, `heard` tardío tras
  desmontar (test vacuo), quitar `signal.aborted` tras `evaluate`, tope sin limpiar, `heard`
  descartado contando como silencio. Equivalentes: `disabled` en `pulsar` (`MicButton` ya lo bloquea)
  y `disabled` en `resolver` (los resultados asíncronos se descartan antes de llegar a él).
  1036 pasan + 1 omitido antes de la corrección; tras ella, 260 en `voice`, `components` y `content`.
- Ruling: `TAP_GUARD_MS = 800` (no estaba en el plan; decisión del implementador, avalada por el
  revisor). Tras un veredicto los botones quedan inertes y a los 800 ms el turno vuelve a `idle`;
  los silencios se reinician al dar veredicto. Evita dos veredictos con un doble toque y deja el
  turno reutilizable si el padre no remonta — si fuera equivocado, se cambiaría por un latch por
  montaje, y solo afectaría a `VoiceTurn`.
- Ruling: un `heard` (o el fin de la evaluación) que llega con `disabled=true` se descarta y el
  turno vuelve a `idle`, sin `onVerdict`/`onModelDone` y sin contar silencio — `disabled` = «locked o
  audio de pista sonando»: el motor no puede aceptarlo entonces y P7 dice que la voz del dispositivo
  no cuenta como la del niño. Si fuera equivocado, se pierde un intento hablado en un caso raro.
- Ruling: `EVALUATION_MAX_MS = 5000` con `Promise.race` sobre `pickEvaluator`+`evaluate`; al vencer,
  botones del adulto — el plan solo pedía tope para el audio, pero P4 lo exige y `browser`/`azure`
  van por red. Si fuera equivocado, costaría un `Promise.race` de más.
- Tarea 4: minor (deferred): **para la Tarea 5** — `mouthShapesFor` lanza si un fonema no tiene forma
  (`mouths.ts`) y la invariante V1 solo cubre las fases 1 y 2: proteger `Mouth` con try/catch o error
  boundary al integrarla, o ampliar la invariante a todo lo que llegue a `say-it`.
- Tarea 4: minor (deferred): `silence`/`unavailable` con `disabled` no se descartan (solo `heard`):
  el silencio cuenta y suena «No te oí» aunque haya una pista sonando. Con `disabled` durante la
  cuenta atrás la escucha se abre igual (el descarte cubre P7 en el resultado, no en el micrófono).
- Tarea 4: minor (deferred): tras vencer el tope, el `evaluate()` colgado sigue vivo en segundo plano
  porque no recibe `signal` (contrato de `speech/`; relevante con `browser`/`azure`).
- Tarea 4: minor (deferred): `Mouth` no resetea `paso` cuando `playing` pasa a false; si `onVerdict`
  lanza queda un rechazo sin capturar (`void escuchar`/`dar`); `setNivel(0)` tras escuchar sin test
  (solo visual); durante los 800 ms de `resuelto` el micrófono se ve activo pero ignora el toque.
- Tarea 4: minor (deferred): sin verificación visual en 360×640 ni 1024×768 (estilos placeholder;
  `browser-qa` llega con la integración de la Tarea 5). `speechTarget` sin adaptar: `browser`/`azure`
  lo necesitarán por las tildes («mamá»); ya anotado en la Tarea 3.
- Nota de proceso: el scratchpad compartido causó una incidencia: un `mut.py` genérico fue
  sobrescrito por otro proceso y dejó una mutación en `VoiceTurn.tsx`; el implementador la vio con
  `git diff` y la restauró antes de commitear, y el re-revisor confirmó que no queda residuo. En los
  despachos con mutaciones, pedir nombres de script únicos o worktrees propios.
