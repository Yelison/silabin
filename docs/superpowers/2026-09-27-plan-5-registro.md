# Plan 5 — registro

Plan 5 = voz: `say-it` y `read-word` con el evaluador `parent` pulido, captura con
`getUserMedia` y desbloqueo de la Fase 1 (D14). Rama `feat/plan-5-voz` (desde `main` tras
fusionar el PR #5).

## Estado

**Fase: plan escrito (2026-09-28), pendiente de la revisión del autor; después, ejecución.**
Plan: `docs/superpowers/plans/2026-09-28-silabin-voz.md`, 7 tareas. Ejecutar con
`/model sonnet` y `superpowers:subagent-driven-development`, en sesiones de 2-3 tareas.

| Tarea | Contenido | Riesgo | Estado |
|---|---|---|---|
| 1 | `*.test.tsx` en jsdom (trampa 8), trampa 4 por test | configuración | pendiente |
| 2 | `submitSpeech`, D19 en el motor, `syllablesVoiced`, `hideMic`, invariante de la trampa 9 | motor/store, mutaciones | pendiente |
| 3 | `speech/`: VAD, captura, evaluador `parent`, `pickEvaluator` | lógica nueva, mutaciones | pendiente |
| 4 | `Mouth`, `MicButton`, `VoiceTurn` | interfaz con estado, mutaciones | pendiente |
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
