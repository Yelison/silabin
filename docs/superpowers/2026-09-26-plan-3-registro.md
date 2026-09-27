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
D12 (entre sesiones 2 y 3) llegaron las 65 ilustraciones (3D suave tipo juguete) y 6 iconos planos; se integran en una **Tarea 5b** nueva, antes de la 6, para que la prueba manual de la Fase 0 use las imágenes reales. Orden: 3 → 4 → 5 → 5b → 6. Origen de los ficheros y contrato en la Tarea 5b del plan.

## Hallazgo al escribir el plan

`build` no tiene opciones y los ítems `syllable` no llevan `task`: `checkAnswer` lanzaría a mitad de un ejercicio de build (trampa 9 en otra forma). La Tarea 2 lo cierra con `expectedAnswer` y el invariante M11.

## Estado

Tareas 1 (sesión 1) y 2 (sesión 2) completas. Siguiente: Tarea 3.
D11 cumplida (2026-09-26): el autor probó con `pnpm dev` en Edge y Chrome (Windows, WSL2): sesiones, pistas y guardado bien (lo comprobó con la exportación o IndexedDB, porque el mapa no enseña nada hasta completar la unidad). Única incidencia: en Edge la pausa entre sílabas es mucho más larga («ga ····· to») por la latencia de las voces «Natural» de red; en Chrome no pasa. Añadida a la Tarea 1 (casos A15-A21). No probado en iPhone/iPad.
Tras la prueba, la Tarea 1 lleva tres partes con commits separados: base visual, elección de voz (A8-A14) y pausa entre sílabas (A15-A21). El coordinador puede despachar las dos de audio como un segundo implementador dentro de la misma tarea, con su propia revisión completa.
minor (deferred) para el Plan 6: el mapa no enseña ningún avance hasta completar una unidad (5-6 sesiones en `phase0:clap`); ni el niño ni el adulto ven que se guarda.

## Escaneo previo (sesión 1, 2026-09-26)

| Tareas | Produce → consume | Hallazgo |
|---|---|---|
| T1 → T3, T4, T5 | `OptionCard` (contrato fijado), `Picture`, `ReplayButton` | `Picture` y `ReplayButton` sin contrato en T1 → R20 |
| T2 → T3-T6 | `expectedAnswer`, `expectedPieces`, `reducedPieces`, `audio-keys` | firmas fijadas en T2; coherente con los consumos |
| T3 → T4 | `ChoiceEvaluation`, `choiceEffect`; T4 modifica `hint-effects.ts` | coherente (T4 amplía, no cambia) |
| T3, T4, T5 | los tres modifican `registry.ts` | secuencial, sin conflicto |
| T1a ↔ T1b | ninguno comparte fichero (`components/`+estilos vs `audio/`) | independientes |
| T1 interna | aceptación `grep amber-/yellow-/gray-` vs lista de ficheros | coherente; el grep abarca todo `src`, así que cualquier `.tsx` con esas clases entra aunque no esté en la lista |
| T1b interna | A16 «el total no pasa de…» y la mutación 2 «el test de A16 mide el orden» | medible con fake timers; sin conflicto |
| T2-T6 internas | se revisan al despachar cada una | — |

Ruling: R20 — `Picture` conserva el contrato de `Imagen` (`{ imageKey: string | undefined }`, `null` si no hay imagen) con clases de token y tamaño por prop opcional `size: "lg" | "md"` (por defecto `lg`); `ReplayButton` es `{ onReplay(): void; disabled?: boolean; "aria-label": string }`, sin llamar a `useAudio` (quien lo usa decide qué suena) — la T1 no fijaba sus contratos y T3-T5 los consumen — si fuera equivocado, T3 retoca dos componentes pequeños.
Ruling: la Tarea 1 se ejecuta como 1a (base visual, un implementador) y 1b (voz A8-A14 + pausa A15-A21, un segundo implementador, dos commits), cada una con su revisión — lo permite el plan y separa la revisión de cumplimiento de la de mutaciones — coste si fuera equivocado: una revisión más.

## Tarea 1a (base visual)

Task 1a: implementada en 04f551d (BASE 24d1e12). Revisión: Approved, spec ❌ solo por contraste.
Ruling: los bordes de estado (`calm-border`, `mark-border`) se oscurecen hasta ≥ 3:1 sobre `surface`, `card` y su propio fondo, manteniendo el tono — el plan da los valores como «propuesta inicial» y exige comprobar el contraste (spec §9); el revisor lo marcó plan-mandated — si fuera equivocado, los bordes quedan algo más oscuros que la propuesta, y la paleta definitiva los cambiará igualmente.
Ruling: se acepta el cambio de aserción de `SaveWarning.test.tsx` (`/gray|grey/` → `/ink-soft/`) — el grep de aceptación prohíbe `gray-` en producción y la aserción de comportamiento (icono neutro, sin rojo ni aspa) sigue intacta — coste si fuera equivocado: ninguno funcional.
Task 1a: minor (deferred): `MapScreen` estado `active` pasa a `bg-action ring-action` (mismo tono en fondo y aro), pierde el matiz de dos tonos.
Task 1a: minor (deferred): guard `if (locked) return` redundante con `disabled` de `ReplayButton` en `count-syllables/Evaluation.tsx`.
Task 1a: fix round 1/5 (1 addressed, 0 open — bordes de estado a ≥ 3:1: calm-border #5187C7, mark-border #AC7600, mínimo 3.07:1; commits 04f551d..b9f2fd4)
Task 1a: complete (commits 24d1e12..b9f2fd4, review clean)

## Tarea 1b (voz y pausa entre sílabas)

Task 1b: implementada en 7cd36ed (voz, A8-A14) y 36d0a06 (pausa, A15-A21), BASE 18b296d. Revisión completa: Approved, 5 mutaciones (4 muertas, 1 superviviente legítima).
Ruling: se aceptan las 5 aserciones reescritas en `speech-player.test.ts` (A5 y 4 de robustez de la cola: ahora la sílaba en curso ya se ha pedido a `synth` cuando `onSegment`/`beat` llaman a `stop()`) — es consecuencia forzada del contrato «onSegment y beat en el onstart», y el revisor comprobó por mutación que la invariante (sin sílabas ni callbacks tras `stop()`) sigue protegida; `stop()` sigue llamando a `synth.cancel()` — si fuera equivocado, en un navegador real podría oírse el arranque de una sílaba ya cancelada.
Ruling: la mutación 2 del brief (pausa negativa sin `max(0, …)`) sobrevive y se acepta — `setTimeout` con retraso negativo equivale a 0 y no es distinguible desde fuera; el `Math.max` se queda como claridad — coste si fuera equivocado: ninguno observable.
Ruling: R19 aplicado (en `pickVoice` el acento pesa más que la calidad; A10).
Task 1b: minor (deferred): A18 y A20 fusionados en un solo test (cubre las dos propiedades).
Task 1b: minor (deferred): los tests reescritos de robustez no comprueban `synth.cancelCalls` localmente (lo cubre otro test existente).
Task 1: complete (commits 24d1e12..36d0a06, review clean; 1a y 1b revisadas por separado)
Sesión 1: Tarea 1 hecha. Tokens sesión 1: no medida.

## Tarea 2 (motor y contenido)

Sesión 2 (2026-09-26). BASE 3393b89.
Ruling: `rimeOf` conserva la grafía (`ratón` → «ón», como dice la firma) y M8/M9 comparan tras quitar tildes (la tabla de M8 escribe «on») — la firma y la tabla se contradecían; la grafía con tilde sirve mejor como texto del manifiesto para la voz — si fuera equivocado, se cambia una normalización y dos tests.
Ruling: piezas de `build` y `isForbiddenDistractor`: la consonante del ítem siempre entra; las demás consonantes vistas se añaden en orden de `seen` saltando cualquiera que forme par prohibido (b/d/p/q) con una ya incluida — el plan dice «nunca b/d/p/q juntas» sin fijar cuál cae — si fuera equivocado, el niño ve alguna consonante menos entre las piezas.
Task 2: implementada en 214ea6b. Revisión: Approved con 2 Important (mutaciones supervivientes: exclusión b/d/p/q solo probada contra la consonante propia; rama «termina en s» de `rimeOf` sin caso). Entran en la ronda 1.
Task 2: minor (deferred): el patrón `letter:${phoneme}` se repite en `answers.ts` y `planner.ts`; un `letterIdOf` lo unificaría.
Task 2: minor (deferred): M11 barre 200 semillas por unidad para cubrir combinaciones; determinista, pero de cobertura probabilística.
Task 2: fix round 1/5 (2 addressed, 0 open — test de dos consonantes vistas que chocan entre sí; casos de `rimeOf` terminados en s: «lunas», «compás»; commits 214ea6b..9e36d46)
Task 2: minor (deferred): `expectedPieces`/`reducedPieces` lanzan ante datos incoherentes; las Tareas 3-5 deben llamarlos solo en `build` o capturarlo en sus tests.
Task 2: complete (commits 3393b89..9e36d46, review clean)
Sesión 2: Tarea 2 hecha (1 implementador, 1 revisión, 1 ronda de corrección, 1 re-revisión). Tokens sesión 2: `/usage` marca «Current session 90 %» al cerrar; es la ventana de uso de la suscripción, no solo esta conversación, así que puede incluir la sesión 1 si cayó en la misma ventana. Siguiente: Tarea 3.

## Tarea 3 (elección compartida, rhyme, initial-sound)

Sesión 3 (2026-09-26). BASE 886cc86. Coordinador en Sonnet 5 (puerta de modelo cumplida).
Ruling: R17 — en `dim` se atenúa el primer id de `exercise.optionIds` que no es la respuesta (el motor ya mezcló, así que es determinista) — el plan lo preveía; el usuario lo confirma al retomar — si fuera equivocado, cambia qué tarjeta se atenúa, no si el niño puede acertar.
Task 3: implementada en 20ce86d (1 implementador Sonnet). Revisión completa (Sonnet, 14 mutaciones): Approved, sin Critical ni Important. Las 4 mutaciones del brief mueren; 3 sobreviven (2b, 2c equivalentes por la doble guarda `blocked` + `disabled`; E5 y E8, huecos menores).
Ruling: se acepta `choice/PictureChoice.tsx` (no estaba en el brief) — es el cuerpo común de `rhyme/Evaluation` e `initial-sound/Evaluation`, evita ~45 líneas duplicadas y no toca pedagogía; T4 puede usarlo o no — si fuera equivocado, se inlinea en las dos Evaluation.
Ruling: el id real del ítem oral es `oral:initial:avión` (con tilde), no `avion` como dice X11 del brief — solo afecta a los tests — coste si fuera equivocado: ninguno.
Ruling: el RED de la Tarea 3 se simuló quitando la producción y `registry.ts` (el implementador escribió antes el código) — la revisión por mutación (14 mutaciones) da la evidencia que el RED habría dado — si fuera equivocado, algún test podría pasar sin haber fallado nunca; las 4 mutaciones críticas lo descartan.
Task 3: minor (deferred): `onsetRequest` es privada en `hint-effects.ts` y `initial-sound/Presentation.tsx` reescribe la partición «inicio + resto» en línea; exportarla evita que diverjan.
Task 3: minor (deferred): `picture:${item.text}` está hardcodeado en `hint-effects.ts` y `rhyme/Presentation.tsx`; `pictureId` de `content/pictures.ts` no sale por `@/engine`.
Task 3: minor (deferred): `dim` usa `exercise.optionIds` y no el parámetro `optionIds`; igual con R17, pero hear-it (T4) debe tenerlo presente.
Task 3: minor (deferred): sin test de `layout="grid"`, de la cancelación de la secuencia por `token` (E5) ni de `ReplayButton disabled={locked}` (E8); `rhyme/Presentation` copia estilos de `OptionCard` en una tarjeta propia.
Task 3: minor (deferred): `ReplayButton` vive fuera de `ChoiceEvaluation`; pulsarlo durante una `sequence` intercala audio (cosmético). T4 puede pasar un `header`.
Task 3: minor (deferred): ⚠️ sin scroll en 360×640 con 3 imágenes (presentación de `phoneme:a` y evaluación de initial-sound con 3 opciones) solo calculado a mano; confirmar en la prueba manual de la Tarea 5b/6.
Task 3: complete (commits 886cc86..20ce86d, review clean)

## Tarea 4 (hear-it y listen-tap)

Sesión 3 (continúa). BASE 586b1b5.
Task 4: implementada en b8de3a3 (1 implementador Sonnet, RED real). Revisión completa (Sonnet, 14 mutaciones distintas de las del implementador): Approved, sin Critical ni Important. Las 4 del brief mueren; sobreviven M1b (emoji 👍/✋ sin assert), M14 (`PAUSE_MS = 0`) y dos equivalentes (M11, M12: guarda de `select` y `disabled` redundantes; juntas mueren).
Ruling: R18 — `listen-tap` pinta el par minúscula grande + mayúscula al lado en cada opción de letra con el componente `Written` (`display`); sílabas y palabras en minúscula — spec §2 «par A/a siempre visible» — si fuera equivocado, se cambia el pintado de una prop y sus tests.
Ruling: la pista 2 de `hear-it` con respuesta «no» es `pulse` con `optionId: null` y `word:<w>` normal (no `replay`) — suena igual, el tipo `ChoiceEffect` ya admite `null`, y la pista 2 queda siempre como `pulse` sin opción — si fuera equivocado, se cambia el `kind` en un caso y su test.
Ruling: la pausa entre las dos reproducciones de la presentación de `listen-tap` es `PAUSE_MS = 900` ms, cancelada al desmontar — el brief pide «con pausa» sin valor — si fuera equivocado, se ajusta una constante.
Task 4: minor (deferred): sin assert del emoji 👍/✋ de hear-it (contenido `aria-hidden`); la 5b los sustituye por iconos y ahí debe quedar un assert del icono.
Task 4: minor (deferred): `PAUSE_MS` puede bajar a 0 sin que falle ningún test.
Task 4: minor (deferred): si `audio.play` no resuelve ni rechaza nunca, las presentaciones de hear-it y listen-tap (y la `sequence` de T3) dejan al niño sin avanzar; mismo patrón que rhyme. Comprobar que el `AudioPlayer` real siempre resuelve o rechaza (Tarea 6).
Task 4: minor (deferred): `hear-it/Evaluation` pasa un `lookup` que no usa (lo exige el tipo) y `word:${item.text}` va hardcodeado (las 8 palabras no llevan tilde); el cableado de `ReplayButton` está repetido en las dos Evaluation.
Task 4: minor (deferred): ⚠️ objetivos ≥72/128 px, `font-reading` real y ausencia de scroll en 360×640 con la cabecera de hear-it (imagen + altavoz + dos botones 7xl): sin verificar; entra en la prueba manual de la 5b/6.
Task 4: complete (commits cef36b7..b8de3a3, review clean)
Sesión 3: Tareas 3 y 4 hechas (2 implementadores, 2 revisiones, 0 rondas de corrección). Tokens sesión 3: sin medir. Siguiente: Tarea 5 (`build`, tocar o arrastrar; R15).

## Tarea 5 (`build`, tocar o arrastrar)

Sesión 4 (2026-09-26). BASE 6b97684. Coordinador en Sonnet 5 (puerta de modelo cumplida). Orden acordado D12: 5 → 5b → 6.
Ruling: R19 — briefs, reportes y diffs de la Tarea 5 van en el scratchpad de la sesión (`/tmp/...`) y no en `.superpowers/sdd/`, porque el clasificador de permisos denegó operar sobre `.superpowers/sdd/2026-09-26-plan-3-toque/` tras un comando mío mal pensado; los scripts `task-brief` y `review-package` de la skill tampoco sirven (buscan «Task N» y el plan dice «Tarea N»), así que el brief se extrajo con `sed` y el diff con `git diff` — si fuera equivocado, se pierde solo material desechable; un `task-5-brief.md` puede haber quedado en el directorio bloqueado.
Task 5: implementada en 596a4d1 (1 implementador Sonnet, RED real: 44 de 44 fallaban por aserciones con stubs; 20 mutaciones propias, 2 supervivientes justificadas). Revisión completa (Sonnet, 23 mutaciones distintas): Needs fixes. C1 Critical, I1 Important.
Task 5: C1 — el rung 3 real se atascaba: en el tercer fallo el motor devuelve `assisted`, `SessionScreen` no cambia `attemptKey`, las casillas seguían llenas con el fallo y `interactiva()` bloqueaba todas las piezas; `onModelDone` nunca llegaba. B9 no lo veía porque montaba el rung 3 con casillas vacías. El coordinador lo confirmó leyendo `SessionScreen.tsx`.
Task 5: I1 — con ratón en Chromium el toque no hacía nada: `setPointerCapture` en `pointerdown` retargeteaba el `click` al `div`. Verificado por el revisor en Chromium real (táctil y arrastre funcionaban).
Task 5: fix round 1/2 (2 addressed, 0 open; commits 596a4d1..9ebad6e). C1: se vacían las casillas al llegar `highlight-both-pieces-in-order`, una vez por `feedback` nuevo, sin tocar `SessionScreen`; tests unitarios más `build/SessionFlow.test.tsx` con motor, store y `SessionScreen` reales. I1: la captura pasa a `alMover` al superar 10 px, una sola vez. Re-revisión acotada (Sonnet, Chromium real con ratón y táctil): Approved, 5 mutaciones muertas, ninguna superviviente.
Ruling: R20 — en el rung 3, una pieza del modelo tocada fuera de turno queda deshabilitada sin reacción ni mensaje, y las piezas que no son del modelo quedan `dimmed` — lectura literal del brief («solo se acepta colocarlas en ese orden»), sin mensaje negativo (spec §2) — si fuera equivocado, se cambia un estado visual y su test.
Ruling: R21 — se acepta `compact` (mínimo de 72 px) en `components/OptionCard`, que no estaba en el brief: es opcional, no cambia el tamaño por defecto, tiene test y 72 px es lo que ya usa `ReplayButton` — si fuera equivocado, se inlinea en `build`.
Ruling: R22 — el arrastre detecta la casilla con `document.elementsFromPoint` al soltar (descartando la propia pieza; mockeado en jsdom) y un umbral de 10 px; menos de 10 px con ratón cuenta como toque — verificado en Chromium real, ratón y táctil con `touch-action: none` — si fuera equivocado, cambia un umbral y la detección.
Ruling: la mutación 1 del brief («enviar `onAnswer` otra vez al tocar tras llenar») es inalcanzable en su forma ingenua, porque `OptionCard` ya bloquea el toque estando disabled; su forma efectiva (quitar `llenas` de `interactiva`) la mata B3 — coste si fuera equivocado: ninguno.
Task 5: minor (deferred): faltan tests de `pointercancel` (`Evaluation.tsx:194`), de `attemptKey` durante un arrastre (`:74`) y del `dimmed` del resto de piezas en el modelo (`:206`).
Task 5: minor (deferred): el planificador aún no saca `build` en las sesiones de `phase2:m`; `SessionFlow.test.tsx` inyecta la corrida con `store.setState`. Cuando salga por la vía normal, sustituir la inyección; comprobarlo en la Tarea 6.
Task 5: minor (deferred): ⚠️ sin medir la altura de la bandeja en 360×640 con unas 13 piezas de 72 px (puede pedir scroll); entra en la prueba manual de la 5b/6.
Task 5: minor (deferred): ⚠️ WebKit/Safari iOS y Firefox sin probar (I1 solo se verificó en Chromium); la lista de verificación en iPad (Plan 6) debe incluir tocar y arrastrar en `build`.
Task 5: minor (deferred): el `README.md` de esta rama sigue diciendo que el Plan 2 está «sin fusionar aún» y que el Plan 3 es el siguiente paso; `main` ya lo tiene fusionado (PR #3). Actualizar el estado al cerrar el Plan 3.
Task 5: complete (commits 6b97684..9ebad6e, 2 revisiones, 1 ronda de corrección)
Sesión 4: Tarea 5 hecha (1 implementador, 1 revisión completa, 1 re-revisión, 1 ronda). Tokens sesión 4: sin medir. Siguiente: Tarea 5b (ilustraciones e iconos; `sed -n 575,664p` del plan); ahí debe quedar un assert del icono de hear-it (minor de la Tarea 4).

## Tarea 5b (ilustraciones e iconos reales)

Sesión 4 (continúa). BASE c75d6a4. Coordinador en Sonnet 5.
Task 5b: implementada en 44a62ec (script y 65 WebP, 1,3 MB, el mayor `mimo` con 40 KB) y b03e501 (`slugFor`/`imageFor`, `Picture` con respaldo, `Icon`, emoji de interfaz sustituido) por 1 implementador Sonnet, RED real (I3 e I7 pasaban en falso al principio y se endurecieron). Revisión de cumplimiento (Sonnet, 4 mutaciones: `slugFor` sin tildes, `Picture` sin `onError`, `Icon` con `alt`, `imageFor` sin `/palabras/`; todas muertas): Approved, sin Critical ni Important, 0 rondas de corrección. `pnpm build` en verde según el implementador. El revisor miró las 65 ilustraciones en 4 hojas de contacto: las 65 coinciden con su palabra y con `docs/ilustraciones-prompts.md`, sin texto incrustado ni halos.
Ruling: R23 — el `biome-ignore lint/performance/noImgElement` de `Picture.tsx` e `Icon.tsx` (el brief lo llamaba «R21 previsto», número ya usado en la Tarea 5) va con su motivo en el comentario: los ficheros ya vienen a su tamaño, la PWA los precachea tal cual (spec §8) y el optimizador de `next/image` no funciona sin servidor — si fuera equivocado, se migra a `next/image` y se cambia `src`.
Ruling: `pipa` se queda como biberón — es intencional (en República Dominicana «pipa» es el biberón, prompt fila 35) — si fuera equivocado, se regenera un dibujo y se sustituye un WebP.
Task 5b: minor (deferred): ilustraciones a criterio del autor: `una` (uña) parece una mano con uñas pintadas y puede leerse como «mano»; `asa` es una taza entera y puede leerse como «taza» (así lo pedía el prompt); `sumo` va con el torso descubierto (mawashi); iglú y velo tienen poco contraste sobre `--color-calm` a 96 px.
Task 5b: minor (deferred): `mama`, `mimo`, `pelo`, `uno`, `escoba` y `ala` llegan al borde del cuadro (el prompt pedía 70-80 % con margen); estilo mixto (las personas se ven más planas que los objetos 3D); `mala` y `tomate` con rojo dominante.
Task 5b: minor (deferred): `scripts/optimizar-ilustraciones.py:24-27` solo cuenta 65 PNG y no valida los nombres contra el currículo (un sobrante no lo caza nadie; I3 cubre la dirección peligrosa); un fallo a mitad deja WebP parciales en `public/`.
Task 5b: minor (deferred): ⚠️ la mano de `OptionCard` marcada (56 px, `-top-8`) solapa unos 17 px la tarjeta; en `compact` (bandeja de `build`) puede rozar la letra y sobresale 32 px sobre la fila vecina. Es `pointer-events-none`. Mirar en la prueba manual de la Tarea 6.
Task 5b: minor (deferred): el emoji de respaldo de `Picture` (`text-9xl`, ~128 px) ocupa menos que el `img` de 160 px: pequeño salto de layout, cosmético.
Task 5b: minor (deferred): ⚠️ sin verificar en navegador el aspecto de los iconos dentro de `BigButton`/`ReplayButton`, ni el precacheo de la PWA; el revisor no corrió `pnpm build` ni el script contra `/mnt/c`.
Task 5b: cerrado el minor de la Tarea 4: `hear-it/Evaluation.test.tsx` asserta ui-replay, ui-yes y ui-no y la ausencia de 👍✋🔊.
Task 5b: complete (commits c75d6a4..b03e501, review clean)
Sesión 4: Tareas 5 y 5b hechas (2 implementadores, 3 revisiones, 1 ronda de corrección). Tokens sesión 4: sin medir. Siguiente: Tarea 6 (`sed -n 665,726p` del plan): la Fase 0 de punta a punta, ruta de desarrollo y cierre; incluye la prueba manual. Después, revisión final de la rama con Opus y PR (pregunta al autor antes del push).

## Tarea 6 (la Fase 0 de punta a punta y `/dev/plantillas`)

Sesión 5 (2026-09-26). BASE 2f26d1e. Coordinador en Sonnet 5 (puerta de modelo cumplida).
Ruling: R24 — no se toca el planificador del motor para que `build` salga en `phase2:m`; `build/SessionFlow.test.tsx` conserva su inyección con `store.setState` — no está en el alcance de la Tarea 6 y `engine/` decide pedagogía (cambiarlo pide su propio plan) — si fuera equivocado, se abre una tarea en el Plan 4 para sustituir la inyección.
Task 6 (código): implementada en eac18ca (7 tests de integración con vistas, motor y store reales: rhyme, initial y hear-it hasta `EndScreen`, y fallo a propósito en cada rung hasta el modelo en las cuatro unidades de la Fase 0; cada sesión queda guardada en el adaptador) y c346303 (`/dev/plantillas` con `notFound()` en producción, 2 tests de la guarda y 7 del componente `PlantillasDev`) por 1 implementador Sonnet. Puertas: 817 tests (1 skipped), typecheck, lint y `pnpm build` en verde; con `next start` la ruta da 404 y `/` da 200.
Revisión (Sonnet, 8 mutaciones: guarda borrada, guarda con `VERCEL_ENV`, `assisted` sin incrementar, `appendSession` sin añadir, `endSession` quitado, `saveState` simulado, rung 3 con un solo fallo, `locked={false}`; 7 muertas): Approved, cumplimiento y calidad ✅, sin Critical ni Important, 0 rondas de corrección. Sobrevivió una: rung 2 con un solo fallo en `PlantillasDev`.
Task 6: minor (deferred): `PlantillasDev.test.tsx` (~l.77-95) no pulsa «Rung 2»: su feedback puede romperse sin que falle nada (herramienta de desarrollo, no llega a producción).
Task 6: minor (deferred): `jugarSesion` en `Phase0.integration.test.tsx` solo exige `evaluaciones > 0`, no un número de ejercicios contestados; `planSession` e `isSessionOver` ya tienen sus tests.
Task 6: minor (deferred): el implementador y el revisor hicieron `pkill` de procesos `next` en el puerto 3000; si el autor tenía un `pnpm dev` en marcha, hay que relanzarlo.
Task 6: código completo (commits 2f26d1e..c346303, review clean). Falta el README (dispatch aparte) y la prueba manual del autor con `pnpm dev` (Fase 0 y `/dev/plantillas`; en 360×640: hear-it sin scroll, initial-sound con 3 opciones, bandeja de `build`; la mano de `OptionCard` marcada; iconos en BigButton/ReplayButton).
Task 6 (README): f00a483 por 1 implementador Sonnet (8 cambios exigidos, más el estado del Plan 2 corregido a «fusionado, PR #3», el Plan 3 en el índice y «Siguientes pasos» reescrito). El coordinador comprobó el diff del README y que el índice y las tablas cuadran; las puertas siguen en 817 tests, typecheck y lint. Cambio solo de documentación: sin revisión de mutación (riesgo bajo, según el plan).
Task 6: minor (deferred): el README no reverifica si la base visual resolvió la deuda de interfaz del Plan 2 (objetivos <72 px); el ledger tiene números de ruling duplicados (R19 y R20 salen dos veces: los de la Tarea 5 y los previstos por el plan), por eso el README no cita un rango R15-R24.
Task 6: pendiente solo la prueba manual del autor con `pnpm dev` (ver la lista de la entrada anterior). Después: revisión final de la rama con Opus y PR (preguntar antes de push).
Sesión 5: Tarea 6 hecha en código y README (2 implementadores, 1 revisión, 0 rondas). Tokens sesión 5: sin medir.

## Tarea 6: ronda de corrección 1 (defecto de la prueba manual del autor)
Task 6: el autor abrió `/dev/plantillas` con `pnpm dev` y la página reventaba («pick no puede elegir de un arreglo vacío», `planner.ts:221`). El revisor y los tests no lo cazaron: `PlantillasDev.test.tsx` solo probaba un par plantilla×ítem.
Task 6: fix round 1/2 (1 addressed, 0 open; commits 1b88dcf..d8d2418). Causa raíz: el selector ofrecía a `initial-sound` los ítems `oral-skill` de clap y hear-it, que no traen `task.optionIds` ni fonemas, y `buildOptions` se quedaba sin candidatos. `engine/` intacto. Arreglo en `itemsDe`: un ítem oral solo se ofrece con la plantilla de la unidad que lo introduce. 4 tests nuevos: barrido de las 128 combinaciones ofrecidas (semillas fijas) y barrido que monta cada una y pulsa rung 1-3, «Sin feedback» y `locked`; RED real (68 entradas fallaban antes). Re-revisión acotada (Sonnet, 4 mutaciones, 3 matadas por los barridos y 1 por el test de filtrado; 60 semillas sin fallo): ADDRESSED, sin roturas nuevas.
Task 6: minor (deferred): el barrido de montaje de `PlantillasDev.test.tsx` tarda ~12 s (timeout 120 s) y crece lineal con el currículo; vigilar si se alarga.
Lección: los barridos exhaustivos sobre el selector debieron estar en la primera entrega; la revisión de cumplimiento con mutaciones no sustituye probar la página abierta.

## Tarea 6: prueba de punta a punta con Playwright (a petición del autor)
QA (Sonnet, Playwright en el scratchpad y no en el repo, R25; Chromium, Firefox y WebKit; 360×640, 390×844, 768×1024, 1024×768; unas 470 capturas miradas a ojo): la Fase 0 se juega entera en los tres navegadores, el progreso persiste, las pistas van de menos a más sin texto negativo, `/dev/plantillas` sin errores en 1536 ejercicios, 0 `console.error`/4xx/5xx. Hallazgos: 0 Críticos, 2 Importantes, 13 menores. Informe: `qa/informe.md` del scratchpad de la sesión 5 (desechable; lo esencial queda aquí).
Ruling: R25 — Playwright no se añade al repo en esta tarea (el spec lo prevé para el Plan 6) — si fuera equivocado, se añade `@playwright/test` y se versionan los scripts de `qa/`.
Ruling: R26 — se corrigen en esta rama I1 (`listen-tap`: palabras de 406 px se cortan a 360/390), I2 (`count-syllables` a 360×640: 760 frente a 640, tambor a medias), M1 (botones del mapa a 60 px de alto), M5 (icono del tambor descentrado), M6 (mano de `OptionCard` en `compact`), M7 (desborde horizontal ~300 ms en `build` por el `translate-x-32`), M8 (zona muerta táctil de 6-9 px en `build`, el dedo de un niño se mueve eso) y M12 (`listen-tap` Presentation en `system-ui` y no en Andika) — I2, M1 y M5 se ven ya en la Fase 0 jugable, y `listen-tap` y `build` se construyeron en este plan — si fuera equivocado, una ronda de revisión de más.
Ruling: R27 — no se corrigen en esta rama M2 (círculos de 56 px del modelo: no se tocan, no son objetivos de toque), M3 (salida del adulto a 48 px: discreta a propósito), M4 (`build` con 13 piezas clonadas da 20 px de scroll a 360×640; con las 9 reales cabe), M9 (pulsación larga táctil no se cancela al sacar el dedo: sin consecuencias de datos), M10 (ilustraciones ambiguas: decisión estética del autor) y M11 (cadencia de dominio larga: 8, 6, 12 y 10 sesiones con juego perfecto; la decide el spec, se le informa al autor) — si fuera equivocado, se abren como tarea del Plan 6.
Task 6: minor (deferred): M2, M3, M4, M9, M10 (`una`≈`mano`, `asa`=taza, `uso`≈`sopa`, `eso`≈`pelota`, `piso`, iglú y velo sin contraste sobre `--color-calm`, icono «no» de hear-it parece un saludo, `pelo` con corte recto), M11.
Task 6: minor (deferred): M13 sin voz en español `pickVoice` devuelve `null` y el navegador habla con la voz por defecto (el autor lo oyó: voz inglesa leyendo español); falla en silencio, un aviso al adulto iría al Plan 6. Con un motor mudo la presentación tarda ~6 s en mostrar «Siguiente».
Task 6: minor (deferred): sin comprobar: audio real en español, Safari iOS/iPad, táctil en Firefox/WebKit (Playwright no lo permite), rung 1 de `build` con consonantes ya vistas, `locked` fuera de `build`.

## Tarea 6b (correcciones de la prueba con Playwright)
Sesión 5. BASE de652e7. 1 implementador Sonnet, 6 commits: 658e66d (I2 + M5), 66e6899 (I1 + M12), 9994593 (M1), 85af4ae (M6), 0c43e6a (M7), 0ad5059 (M8) y su revert 9ae820a. Medido con Playwright antes y después; 824 tests (1 skipped), typecheck y lint en verde.
Ruling: R28 — se revierte 0ad5059 (M8): el hallazgo fue un artefacto del arnés de la prueba (la página había hecho scroll y el toque caía sobre `<html>`); con el arnés corregido, el código anterior ya colocaba la pieza con 3-9 px y a 10 px arrastraba. El cambio añadía una segunda vía de resolución del toque en `pointerup` sin defecto que lo justificara, con riesgo de duplicar el toque en Safari/iPad, que no podemos probar aquí — si fuera equivocado (el iPad demuestra la zona muerta), se reaplica 0ad5059 con su revert revertido. Aviso: la línea de R26 que lista M8 como «corregido» queda anulada por este ruling.
Revisión (Sonnet; medidas y capturas propias en Chromium a 360×640, 390×844, 768×1024 y 1024×768; sesión real de la Fase 0 a 360×640 sin scroll en ninguna pantalla): Approved con Minors, sin Critical ni Important, 0 rondas de corrección. `count-syllables` real 640/640 a 360×640 con el tambor de 192 px y el icono centrado; palabras de `listen-tap` sin scroll horizontal en los 4 tamaños («mamá» 260 de 328 px a 360); botones del mapa 72 px; 0 cruces de la mano con pieza vecina o letra en 40 casos del rung 3; `build` a 360/390 con `scrollWidth` máximo 360/390 durante la entrada; Andika en `listen-tap`.
Task 6b: minor (deferred): la mano de `compact` roza 4 px el borde inferior de la casilla de arriba en 7 de 40 casos (me, mo, le, se, so, pa, pi; `OptionCard.tsx` `-top-9 w-10`, `gap-y-7` en `build/Evaluation.tsx`); no pisa letra ni pieza.
Task 6b: minor (deferred): el `@custom-variant short (max-height: 760px)` de `count-syllables` es un número mágico acoplado al contenido; sin scroll desde 761 px en modo normal y desde ~624 px en modo short; por debajo de ~624 px de alto (320×568: 56 px de scroll; apaisado 844×390) vuelve el scroll. Un segundo escalón (~620 px, tambor de 160) sería opcional.
Task 6b: minor (deferred): `overflow-x-clip` en `build/Presentation.tsx:78` cambia la entrada a un barrido (a ~250 ms la «m» sale cortada por el borde del contenedor); transitorio, sin recortes al final.
Task 6b: minor (deferred): los tests de M1, M6 y M12 son de clases y no protegen la geometría (solo la medición visual); I1 e I2 sin test; `docs/diseno-visual.md` no menciona la variante `short` ni el tamaño del tambor.
Task 6b: minor (deferred): «m M» marcada en `listen-tap` sigue con las letras casi al borde de la tarjeta; los círculos del modelo (M2) siguen en 56 px.
Task 6b: complete (commits de652e7..9ae820a, review clean)

## Revisión final de toda la rama (Opus)

Sesión 6 (2026-09-27). BASE 2fd20b1. Coordinador en Sonnet 5 (puerta de modelo cumplida). Diff completo `git merge-base main HEAD`..HEAD (9654 líneas, 150 ficheros, ~71 imágenes binarias) revisado por un subagente Opus, con el diff, `diff-stat.txt` y `commits.txt` en el scratchpad de la sesión (R19 sigue aplicando: nada va a `.superpowers/sdd/`).

Veredicto: **Approved con Minors**. Nada bloquea el merge a `main`.

Comprobado y correcto: claves de audio (`ending:`/`stretch:`/`stretch-in:`) que piden las vistas coinciden con las que genera el manifiesto; `expectedAnswer` es la única fuente de la respuesta en todas las plantillas (incluido `hear-it` con `correctOptionId: null`); orden invalidar→pista correcto en `ChoiceEvaluation` y `build/Evaluation`; `ExerciseView` con `key={exercise.id}` no arrastra estado atenuado/marcado entre ejercicios; `/dev/plantillas` da `notFound()` en producción; sin código muerto; `engine/`/`content/` sin React ni DOM; sin `any`/`as any`/`@ts-ignore` nuevos; `features/` no decide pedagogía.

7 mutaciones dirigidas a motor/store/pedagogía, las 7 muertas: `expectedAnswer` de `build` cambiado a `item.id` (muerta por `answers.test`), `dim` atenuando la respuesta correcta (muerta por 4 tests), filtro b/d/p/q quitado de `build` (muerta por `planner.test`), pista 3 de `build` aceptando cualquier orden (muerta por B9/C1 y `SessionFlow` con motor real), opción marcada llamando a `onAnswer` en vez de `onModelDone` (muerta por 8 tests incluida la integración de Fase 0), pista 2 de `hear-it` pidiendo `stretch-in` con respuesta «no» (muerta por H4), `reducedPieces` sin las 5 vocales (muerta por 4 tests).

Hallazgo Important, latente, no alcanzable hoy: con `options: {min: 2}` (nivel `easy`, primer intento), la pista 1 (`dim`, atenúa un distractor) dejaría una sola opción activa —la correcta— en `listen-tap` e `initial-sound` con ítems `phoneme`; el spec supone 3 opciones al dar la pista 1. Solo se ve en `/dev/plantillas`: `listen-tap` (Fase 1/2) e `initial-sound` con `phoneme` no son jugables aún (`isSessionPlayable` los bloquea por `trace`/`say-it`, Planes 4-5). `phase0:initial` (la única unidad jugable) ya trae 3 opciones. Ningún test cubre `easy` + pista 1.

Ruling: R29 — no se corrige ahora este hallazgo; se registra como decisión abierta del Plan 4 (dos salidas posibles: `easy` con 3 opciones para plantillas con `dim`, o no atenuar si quedarían ≤2 activas) — no es alcanzable con el contenido actual y tocarlo pide decidir entre dos diseños distintos de pista, fuera del alcance de este plan — si fuera equivocado (se habilita `listen-tap` o `initial-sound:phoneme` en un plan futuro sin resolverlo primero), la pista 1 regalaría la respuesta la primera vez que un niño falla.

Task 6 (revisión final): minor (deferred), nuevo: `PHONEME_SOUND.p` y las claves `stretch:p*` se locutan como el nombre de letra «p» en vez de su sonido (mismo comportamiento que `phoneme:p` desde el Plan 1, ahora extendido); el test de locución del sonido excluye la p. Sin efecto mientras el audio sea `speechSynthesis` provisional; añadir a la lista cuando llegue la voz de Azure.
Task 6 (revisión final): minor (deferred), nuevo: `stretchedText`/`stretchInText` (`audio-manifest.ts`) asumen fonema de una sola letra (`item.text.slice(1)`, `word.indexOf(phoneme)`); fallarían con «ll», «ch», «qu». Sin contenido afectado hoy.
Task 6 (revisión final): cerrados por la revisión — ya no son deferred: la línea de la Tarea 4 sobre `audio.play` sin resolver nunca (resuelto por `SPEECH_GUARD_MIN_MS` en `speech-player.ts`) y la línea de la Tarea 5 sobre el README desfasado (el README ya refleja el Plan 2 fusionado y el Plan 3 en curso).

Triaje: ningún `Ruling` (R15-R28) ni `minor (deferred)` de la rama bloquea el merge. Atención sin bloquear: M13 (voz inglesa sin voz española) puede merecer aviso al adulto antes del Plan 6 si hay niños usando la app ya; Safari iOS/WebKit y el arrastre de `build` deben entrar en la lista de verificación del iPad antes de desbloquear la Fase 2 (R24/R27).

Sesión 6: revisión final hecha (1 subagente Opus, 0 rondas de corrección — no hubo hallazgos que la exigieran). Siguiente: `superpowers:finishing-a-development-branch`; push y PR requieren confirmación del autor.
