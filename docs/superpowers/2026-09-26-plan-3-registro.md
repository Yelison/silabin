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
Sesión 1: Tarea 1 hecha. Tokens sesión 1: (pendiente, lo apunta el autor).

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
Sesión 2: Tarea 2 hecha. Siguiente: Tarea 3.
