# Plan 5 — registro

Plan 5 = voz: `say-it` y `read-word` con el evaluador `parent` pulido, captura con
`getUserMedia` y desbloqueo de la Fase 1 (D14). Rama `feat/plan-5-voz` (desde `main` tras
fusionar el PR #5).

## Estado

**Fase: preguntas previas (brainstorming), antes de escribir el plan.** El plan todavía no
existe. El diseño sale del spec (§5 pistas, §6 capa de voz); no se escribe spec nuevo, solo las
decisiones D19+ que el spec deja abiertas. Escribir el plan con `/model opus` y
`superpowers:writing-plans` en `docs/superpowers/plans/2026-09-27-silabin-voz.md` (o la fecha
del día).

## Decisiones tomadas con el autor (2026-09-27)

| # | Decisión |
|---|---|
| D19 | **Toque accidental en `trace`:** se ignora. Si la tinta total es mínima (umbral a fijar en el plan, orientativo < 10 % de la longitud de la letra), se borra sola y no cuenta intento ni gasta pista. Coherente con «sin habla detectada → no cuenta intento» de la voz. Cierra la decisión abierta del Plan 4 (registro del Plan 4, revisión final, «Important #3») |
| D20 | **VAD por umbral de energía**, no Silero: `getUserMedia` + `AnalyserNode`; corta a 3 s o a 600 ms de silencio tras habla. Sin dependencias nuevas. Silero llega con el evaluador `browser`/`azure` |

## Preguntas pendientes (retomar aquí)

1. **Boca articulando (pista 1 de `say-it`, acción `show-mouth+replay-instruction` en
   `src/content/templates.ts:193`).** No hay recurso de boca. Opciones planteadas: boca SVG
   esquemática por vocal/consonante (recomendada, placeholder como D8); solo repetir
   instrucción hasta el Plan 6; ilustraciones generadas. **El autor quiso aclarar algo antes
   de responder: pregúntale qué.**
2. **Alcance de desbloqueo:** con `say-it` y `read-word` construidas, la Fase 2 también queda
   jugable (declara `listen-tap`, `build`, `trace`, `say-it`, `read-word`,
   `initial-sound`). Confirmar que el Plan 5 desbloquea Fase 1 **y** Fase 2.
3. **Ajuste «ocultar micrófono» y `speechMode`:** el spec los pone en el panel de padres
   (Plan 6). Decidir si en el Plan 5 quedan con su valor por defecto sin interfaz.
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
