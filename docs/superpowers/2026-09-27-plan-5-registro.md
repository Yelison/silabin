# Plan 5 — registro

Plan 5 = voz: `say-it` y `read-word` con el evaluador `parent` pulido, captura con
`getUserMedia` y desbloqueo de la Fase 1 (D14). Rama `feat/plan-5-voz` (desde `main` tras
fusionar el PR #5).

## Estado

**Fase: ejecución (2026-09-28). Tareas 1-7 completas; siguiente, revisión final de la rama (Opus).**
Plan: `docs/superpowers/plans/2026-09-28-silabin-voz.md`, 7 tareas. Ejecutar con
`/model sonnet` y `superpowers:subagent-driven-development`, en sesiones de 2-3 tareas.

| Tarea | Contenido | Riesgo | Estado |
|---|---|---|---|
| 1 | `*.test.tsx` en jsdom (trampa 8), trampa 4 por test | configuración | **completa** (e91db39, revisión limpia) |
| 2 | `submitSpeech`, D19 en el motor, `syllablesVoiced`, `hideMic`, invariante de la trampa 9 | motor/store, mutaciones | **completa** (fefe69f, 1229fbe) |
| 3 | `speech/`: VAD, captura, evaluador `parent`, `pickEvaluator` | lógica nueva, mutaciones | **completa** (0b82285, 9c19e0c) |
| 4 | `Mouth`, `MicButton`, `VoiceTurn` | interfaz con estado, mutaciones | **completa** (c966a90, 5132eb2, 3a6a6c9) |
| 5 | `say-it` de punta a punta (desbloquea la Fase 1) | contrato, mutaciones | **completa** (a31d41c, 4d71af1) |
| 6 | `read-word` (desbloquea la Fase 2), D19 en la vista, `/dev/plantillas` | contrato, mutaciones | **completa** (7d7973e, 63ef0ad, 231f10b) |
| 7 | Integración, deuda 4, README y poda, lista de la prueba manual | tests/docs | **completa** (1b23591, daac7fd) |

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
- Tarea 5: complete (commits 8f9f46c..4d71af1, review clean a la primera, sin ronda de corrección).
  15 mutaciones del implementador (2 sobrevivieron al principio y se cerraron: la boca persistía en
  la pista 2 y `ReplayButton` sin `hintBusy`) + 17 del revisor, 15 muertas. 1085 pasan + 1 omitido;
  typecheck y lint limpios. Verificado en navegador (Chromium propio; el MCP de Playwright pide Chrome)
  en `/dev/plantillas`: 360×640 y 1024×768 sin scroll, micrófono 96 px, altavoz 80 px, botones del
  adulto 72 px, separación 16 px. Hallazgo: en 360×640 con boca+micrófono+botones medía 586 px sobre
  528 útiles; 4d71af1 pone altavoz y hueco de la boca en una fila (494 px).
- Ruling: `Mouth` se protege con `safeMouthShapes` (`voice/safe-mouth.ts`; si `mouthShapesFor` lanza no
  se pinta la boca y la instrucción sigue) en vez de ampliar V1 — la vista nunca debe caer por un dato
  de contenido; si fuera equivocado, se amplía V1 y se quita la guarda.
- Ruling: se aceptan los cambios de `PlantillasDev` (+test), fuera de la lista de ficheros: el barrido de
  `/dev/plantillas` lanzaba «necesita props.speech» para `say-it` (29 fallos) — si fuera equivocado,
  se movería la inyección de `speech` a otro sitio, solo afecta a la página de desarrollo.
- Ruling: la boca sale solo en la pista 1 (P15) y cada `feedback` nuevo la quita; `ReplayButton` y
  `VoiceTurn` van deshabilitados mientras suena una pista (`hintBusy`) — si fuera equivocado (p. ej. la
  boca debe persistir en la pista 2), es un cambio de una línea en `say-it/Evaluation.tsx` más su test.
- Ruling: `HINT_AUDIO_MAX_MS = 2500` vive en `voice/hint-audio.ts` con `playCapped(audio, request)`
  (`Promise.race`, nunca rechaza, limpia el timer), reutilizado por Presentation y Evaluation; la
  presentación de voz lo usa también, a diferencia de `listen-tap` (deuda 2) — si fuera equivocado,
  se inlinea.
- Tarea 5: minor (deferred): M14 sobrevive — nada prueba la segunda reproducción del ítem tras
  `PAUSE_MS` en `say-it/Presentation` (test: avanzar `PAUSE_MS` y esperar dos `phoneme:a` seguidos).
- Tarea 5: minor (deferred): M16 sobrevive — el test solo usa `accent: "mx"`; un `"mx"` literal en
  `speechTarget(item, accent)` (`say-it/Evaluation.tsx`) no falla (falta el caso `do` → `es-US`, P14).
  Solo importa con `browser`/`azure`.
- Tarea 5: minor (deferred): `onReplay` de `Evaluation` llama a `audio.play` sin `playCapped`; un
  `play` que lance de forma síncrona no queda cubierto por el `.catch` (teórico).
- Tarea 5: minor (deferred): `SessionScreen.resolver` espera `feedback:retry` sin tope (deuda 2 del
  README); con un `play` que nunca resuelve, ni la pista ni el feedback llegan.
- Tarea 5: minor (deferred): `voiceEffect("play-first-syllable")` lanza si el ítem no es palabra;
  `say-it` nunca lo emite, pero **la Tarea 6 (`read-word`) debe cubrirlo**. El efecto `split` solo
  existe en `voiceEffect`: ninguna vista lo pinta aún (Tarea 6).
- Tarea 5: minor (deferred): el layout se midió en `/dev/plantillas`, no en sesión real (necesita progreso
  en IndexedDB); falta iPad/iPhone real (D11). La boca desaparece en la pista 2: probar con niños.
- Nota de proceso: el implementador quedó BLOQUEADO una vez por fallos del clasificador de Bash (no de
  la tarea; ~9 fallos seguidos); se reanudó con `SendMessage` y terminó. El revisor dejó una mutación viva
  un momento por cortar un script con `| head`; la restauró y repitió la tanda; `git status` limpio.
- Tarea 6: fix round 1/2 (1 addressed, 0 open — la mutación «no vaciar `strokesRef` al rechazar un
  intento en el modelo» sobrevivía (74/74); ahora W7 comprueba que la 2.ª llamada a `acceptsModel`
  recibe 1 trazo; solo test, sin cambio de producción; commits 63ef0ad..231f10b).
- Tarea 6: complete (commits c677eaa..231f10b, review clean tras 1 ronda). 16 mutaciones del
  implementador (segunda pasada; la primera se invalidó, ver nota) + 7 del revisor + 1 del re-revisor;
  la única superviviente (D) era la laguna real y se cerró. 1125 pasan + 1 omitido; typecheck y lint
  limpios. Navegador (Chromium propio): sin scroll en 360×640 (máx. 378 px de 528; micrófono 96 px,
  objetivos ≥ 72 px) ni en 1024×768; `/dev/plantillas` desborda 11 px en apaisado por su rejilla de
  dos columnas (a ancho de sesión, 992 px, cabe).
- Ruling: las sílabas separadas (`split`) se quedan visibles hasta el modelo (las pistas suben, no se
  retiran); si fuera equivocado, es una condición en `read-word/Evaluation.tsx`.
- Ruling: la imagen de `read-word` se revela con cualquier `resolution !== null` (también `assisted`),
  como pide el brief; si fuera equivocado, se acota a `mastery-credit`.
- Ruling: en `/dev/plantillas`, `acceptsModel = strokes.length > 0` (D19 en el modelo no se simula allí,
  sin corrida no hay motor) y se añade «Micrófono real» como cuarta opción del selector; solo afecta a
  la página de desarrollo.
- Ruling: `read-word/Palabra.tsx` (fichero nuevo, fuera del brief) comparte la palabra entre
  Presentation y Evaluation; `Picture md` (96 px) en la evaluación, igual que la tarjeta tapada, para
  que no haya salto de layout. Si fuera equivocado, se inlinea.
- Tarea 6: minor (deferred): `read-word/Evaluation` y `say-it/Evaluation` repiten estructura
  (`hintBusy`, `VoiceTurn`); extraer un hook común solo si aparece una tercera plantilla de voz.
- Tarea 6: minor (deferred): si una palabra no tiene imagen (las 35 `img:<palabra>` siguen sin
  resolver), `imageFor` devuelve null y la tarjeta tapada desaparece al resolver sin sustituto.
- Tarea 6: minor (deferred): `Palabra.tsx` usa `text-[min(8rem,26vw)]`; no se ha comprobado que
  coincida con `Written size="lg"` (pulido).
- Tarea 6: minor (deferred): `/dev/plantillas` desborda 11 px en apaisado (rejilla de dos columnas).
- Nota de proceso: la primera tanda de mutaciones de la Tarea 6 restauró con `git checkout --`, que no
  restaura ficheros sin seguimiento y **revirtió trabajo sin commitear** (`SessionScreen.tsx`,
  `trace/Evaluation.tsx`); el implementador lo reaplicó, repitió la pasada con copias de respaldo y lo
  declaró. Lección: en los despachos con mutaciones, exigir copia de respaldo con `cp` (no
  `git checkout --`) mientras haya trabajo sin commitear, y no cortar scripts con `| head`.
- Tarea 7: `Voice.integration.test.tsx` (I1-I7, 7 tests) y la deuda 4 en un commit (1b23591); README,
  archivo y este registro en otro. Mutaciones rápidas para comprobar que I1-I7 no son vacuos, todas
  muertas: `syllablesVoiced += 0` (I1), `MAX_SILENT_TURNS = 3` (I4), `hideMic={false}` en
  `say-it/Evaluation` (I3) y quitar `read-word` de `templateViews` (I5 e I7). Restauradas con copia
  de respaldo; `git status` limpio tras cada una.
- Ruling: el helper `documentoConUnidadesHechas` (documento a mano con unidades dominadas, `hideMic` y
  `itemsExtra`) va en `features/test-support.tsx` y no se refactoriza `documentoCon` de
  `Phase0.integration.test.tsx` para usarlo; si fuera equivocado, son dos copias de un documento de
  prueba y se unifican después.
- Ruling: en `build/SessionFlow.test.tsx` la última aserción pasa de `onEnd` a «avanza al ejercicio
  siguiente y queda `assisted`», porque la sesión real ya no tiene un solo ejercicio; el resto de
  aserciones no se tocó. Si fuera equivocado, se seguiría jugando hasta el fin de la sesión.
- Ruling: en I1 la caja solo sube en el primer acierto de cada ítem y sesión (crédito único por sesión,
  ya así en el motor); los aciertos siguientes del mismo ítem exigen que no baje ni suba.
- Ruling: se añade `certificates` a `.gitignore`: `next dev --experimental-https` lo escribe él solo la
  primera vez que se arranca; se comprobó que arranca (`https://localhost:3457`, «Ready») y se paró. No
  se probó con un móvil. Crea además la CA raíz de `mkcert` en `~/.local/share/mkcert`.
- Tarea 7: minor (deferred): I7 solo cubre con el currículo real las unidades activas `phase1:vowel-a`
  y `phase2:m` (30 semillas cada una); no recorre las otras unidades de la Fase 1 y la 2.

- Tarea 7: complete (commits 1b23591..daac7fd, revisión de cumplimiento limpia, sin ronda de corrección;
  4 mutaciones del implementador, todas muertas; el revisor no vio aserciones vacuas). 1132 pasan + 1
  omitido; typecheck, lint y `pnpm build` en verde.
- Tarea 7: minor (deferred): `README.md` afirma «las 7 tareas pasaron revisión» (falta la revisión final
  de la rama) y la tabla «Documentos y en qué orden leerlos» está duplicada y sin los planes/registros
  del 4 y el 5 (viene de antes); se arreglan tras la revisión final, en el mismo despacho de correcciones.
- Final review: revisión final de la rama con Opus: 0 críticos, 2 importantes (I1 `ctx.resume()` sin tope
  en `capture.ts`; I2 receta HTTPS del README errónea) y M1-M4. I1, I2, M1, M2 y M3 se arreglan en
  db73e02 y el commit de docs; M4 queda diferido en `docs/archivo-trampas-y-deuda.md`.
- Ruling: I1 devuelve `unavailable/error` tras `RESUME_MAX_MS = 1500` (y no `silence`) para que el niño
  llegue a los botones del adulto. Si fuera equivocado, un `resume` lento pero válido (>1,5 s) pasaría
  a botones del adulto en ese turno; se sube la constante.
- Ruling: M1 usa `playCapped` desde `voice/hint-audio.ts` sin moverlo (evita tocar 7 imports y tests);
  `sonar` también lo usa el audio de montaje, que no se espera. Si fuera equivocado, se mueve el
  fichero a `session/` en una tarea de limpieza.
- Ruling: I2 documenta `mkcert` a mano en `certificates/` (ya ignorado) con `-H 0.0.0.0`; no se probó
  con un móvil. Si fuera equivocado, la prueba manual 8 lo destapa.
- Ruling: la deuda 2 del README ya no menciona `SessionScreen.resolver`; M4 va al archivo y no al
  README para respetar el tope de 10 deudas.

- Post-PR (2026-09-28, prueba manual del autor en iPhone/Safari): el micrófono real no
  oía nunca (rms plano ~0,005, bajo `SPEECH_RMS=0,02`), pese a `ctx.state=running` y
  `track.muted=false`. Diagnosticado con log temporal en `/dev/plantillas` (quitado, no
  commiteado). Causa: fallo conocido de WebKit — un `AnalyserNode` no procesa audio si el
  grafo no llega conectado a `ctx.destination`. Arreglo: `analyser -> GainNode(0) ->
  destination` en `src/speech/capture.ts` (commit ab8910b). Test de cableado nuevo en
  `capture.test.ts`; 2 mutaciones (quitar la conexión, `gain.value=1`) detectadas por el
  implementador y confirmadas de nuevo por el revisor. Revisión: ADDRESSED, sin hallazgos.
  1135 tests + 1 omitido; typecheck y lint en verde.
- Ruling: el fallo de iOS no se reprodujo en Chrome/Edge de Windows, coherente con que solo
  WebKit exige el grafo conectado a `destination` — si fuera equivocado, se vería en la
  prueba manual del punto 7/8 al reintentar.
- **Corrección (2026-09-28):** la causa de ab8910b no era la dominante. Instrumentado de
  nuevo (timestamps, sin commitear) en 7 repeticiones seguidas: el hueco entre
  `fase = "listening"` (botón azul) y `getUserMedia()` resuelto de verdad fue de 800 a
  1700 ms cada vez, sumado a los `COUNTDOWN_MS = 900` que ya corrían antes de llamar a
  `listener.listen()`. 5 de 7 palabras cortas dichas al ver el azul dieron «No te oí»: el
  niño hablaba contra un micrófono que la UI ya daba por listo pero que aún no lo estaba.
  El `rms` plano de antes de ab8910b (0,0044-0,0063) variaba con el ruido de fondo, no era
  un cero de grafo no tirado — así que esa causa no explicaba el síntoma real. ab8910b se
  mantiene (inofensivo, puede seguir haciendo falta en otros dispositivos), pero el defecto
  que de verdad impedía oír al niño era este.
- Post-PR (3): `src/speech/capture.ts` y `VoiceTurn.tsx` (commit f2374a4). `listen()` gana
  `warmupMs` y `onReady()`: el colchón arranca en paralelo con `getUserMedia` (no después), y
  `onReady` solo llega cuando se cumplen las dos condiciones (colchón agotado y micrófono
  listo); `VoiceTurn` llama a `listen()` de inmediato al pulsar y solo pasa a `listening`
  dentro de `onReady`. P6 y P7 se mantienen (el `finally` cierra siempre; ningún frame de
  antes de `onReady` llega al VAD). 5 mutaciones dirigidas, las 5 cerradas. Revisión:
  ADDRESSED, sin hallazgos; el revisor reprodujo 2 de las 5 mutaciones él mismo. 1141 tests +
  1 omitido; typecheck y lint en verde.
- Ruling: se descartó partir `Listener` en `prepare()`/`listen()` (como sugería el brief) a
  favor de extender `listen()` con `warmupMs`/`onReady` — más simple, no toca
  `createScriptedListener` — si fuera equivocado, costaría una refactorización de la
  interfaz, pero el contrato observable (cuándo se pasa a `listening`) es el mismo.
- Pendiente: el autor debe repetir la prueba manual con este arreglo antes del PR
  (puntos 1-4 y, sobre todo, palabras cortas dichas nada más ver el azul).

## Prueba manual del autor (antes del PR)

Con la receta HTTPS del README (`mkcert` con la IP de la LAN, `DEV_ORIGINS` y `-H 0.0.0.0`; ver «Cómo ejecutarlo» del
README: el micrófono exige HTTPS, y el móvil debe confiar en el certificado autofirmado):

1. iPad/iPhone con Safari: el permiso de micrófono se pide una vez; el indicador de grabación se
   apaga entre turnos.
2. La instrucción y el modelo se siguen oyendo bien después de abrir el micrófono (iOS cambia la
   sesión de audio).
3. La voz de un niño a la distancia normal da «oído» (P5), y el televisor de fondo no bloquea nada.
4. Denegar el permiso → botones del adulto, sin pantalla muerta.
5. La boca se entiende como boca (D21, placeholder).
6. Un toque accidental en `trace` desaparece sin gastar pista (D19).
7. Con `resume` colgado (Safari iOS) deben salir los botones del adulto en ≤ 1,5 s tras la cuenta
   atrás.
8. La receta HTTPS del README (`mkcert` con la IP de la LAN) funciona desde el móvil con esa IP.

**Estado (2026-09-28), a media prueba — el móvil se quedó sin batería:**
- Punto 3 (voz a distancia normal, palabra corta al ver el micrófono azul): **bien**, tras
  f2374a4. Confirmado en el dispositivo real, varias veces seguidas.
- Punto 8: **bien** (la receta HTTPS funcionó para entrar a la app).
- Duda abierta, sin resolver: recargar la página vuelve a pedir el permiso de micrófono cada
  vez, en pestaña normal (no privada). Sin determinar si (a) es el comportamiento esperado de
  Safari con un certificado autofirmado y no afecta al punto 1 (que es sobre no repetir el
  permiso turno a turno **dentro** de la misma carga de página), o (b) hay un problema real.
  Pendiente: mirar qué dice el ajuste de sitio para «Micrófono» (Preguntar/Permitir) y probar
  varios ejercicios seguidos **sin recargar** para ver si ahí solo lo pide una vez.
- Sin probar todavía: puntos 1 (turno a turno sin recargar), 2, 4, 5, 6, 7.
- No se abre el PR hasta terminar esta lista.
