# Silabín Plan 5: voz (`say-it` y `read-word`) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** que `say-it` y `read-word` queden jugables con el evaluador `parent` pulido
(micrófono que da turno y escucha con un VAD por energía, más los dos botones del adulto), y
que la Fase 1 **y** la Fase 2 se desbloqueen en el mapa (D14, D22). De paso: toque accidental
en `trace` (D19), trampas 4, 8 y 9, y la deuda 4.

**Architecture:** el motor gana `submitSpeech` (recibe solo el veredicto final `ok`/`retry`)
y la regla de tinta despreciable de `trace`. Un módulo nuevo, `speech/`, trae la interfaz
`SpeechEvaluator` del spec (§6), el evaluador `parent` (siempre `unsure`: lo resuelve el
adulto), la elección de evaluador según `speechMode`, un VAD puro por energía y un adaptador
de captura con `getUserMedia` + `AnalyserNode`, inyectable. La interfaz añade `Mouth`,
`MicButton`, `VoiceTurn` (el turno de voz completo) y las vistas de las dos plantillas. Nunca
decide si algo está bien dicho: el adulto da el veredicto y el motor aplica las pistas.

**Tech Stack:** Next.js 16.3.5 (App Router), React 19.2.8, TypeScript estricto, Tailwind 4,
Zod 4, Zustand 5, Vitest 5 + jsdom + Testing Library, Biome 2. **Sin dependencias nuevas**
(D20: nada de Silero).

**Spec:** `docs/superpowers/specs/2026-09-18-silabin-design.md`: §2 principios, §5 pistas
(filas `say-it` y `read-word`), §6 capa de voz y §10 pruebas. Decisiones D19-D23 en el
registro `docs/superpowers/2026-09-27-plan-5-registro.md`, que es también el ledger de este
plan.

**Modo económico (CLAUDE.md):** el plan fija contratos, casos de test y criterios de
aceptación, no la implementación. El implementador la escribe con TDD.

---

## Decisiones

Las de producto están en el registro (D19-D23). Las que se tomaron al escribir el plan
(`Ruling:` de planificación, pasan al registro):

- **P1 · El evaluador `parent` devuelve siempre `unsure`.** El paso 6 del flujo del spec
  (`unsure` → confirmación del adulto) ya es exactamente el comportamiento de `parent`. Así,
  `browser` y `azure` entran después por la misma interfaz sin tocar `VoiceTurn`. Hasta
  entonces, solo un `ok` de un evaluador automático se salta los botones; un `retry` se trata
  como `unsure` (§6: «retry de esta capa se trata como unsure si el VAD detectó habla»). Si
  fuera un error, costaría rehacer una rama de `VoiceTurn`.
- **P2 · Cada «Otra vez» del adulto es un intento fallido que avanza la pista.** Es la lectura
  de §2 «se pide otra vez una sola vez» con `parent`: el adulto ya decidió, y la escalera de
  pistas es la ayuda. Coste si fuera un error: añadir un reintento gratis en `submitSpeech`.
- **P3 · `submitSpeech` solo recibe el veredicto final (`"ok" | "retry"`).** El motor no ve
  audio, VAD ni evaluadores. `submitAnswer` pasa a rechazar las plantillas de trazo **y** de
  voz (se decide por `templates[id].evaluation`).
- **P4 · Sin habla no hay intento, y el adulto nunca queda atrapado.** Si el VAD no oye nada:
  «No te oí» (`feedback:no-speech`) y se vuelve al micrófono, sin llamar al motor. Tras
  `MAX_SILENT_TURNS = 2` silencios seguidos en el mismo intento, aparecen los botones del
  adulto. Lo mismo, desde el principio, si el micrófono no existe, se deniega o `hideMic` está
  activo.
- **P5 · El VAD se sesga hacia «oído».** Con `parent`, un falso positivo no cuesta nada (el
  adulto decide) y un falso negativo frustra al niño con «No te oí». Constantes de partida:
  `SPEECH_RMS 0.02`, `MIN_SPEECH_MS 120`, `SILENCE_AFTER_MS 600`, `MAX_MS 3000`. La prueba
  manual decide si se mueven.
- **P6 · El micrófono se abre y se cierra en cada turno.** Las pistas se paran al acabar, al
  abortar y al desmontar: por privacidad (§6) y para que iOS quite el indicador de grabación.
  No se graba ningún `Blob` (`parent` no lo necesita).
- **P7 · La voz del propio dispositivo no puede contar como la del niño.** Al pulsar el
  micrófono se llama a `audio.stop()`. La cuenta atrás de 3 puntos (`COUNTDOWN_MS 900`) hace
  de colchón, y la captura pide `echoCancellation`.
- **P8 · Las evaluaciones de voz no dan la respuesta.** `ExerciseView` no reproduce
  `item.audioKey` al montar una evaluación cuya plantilla tiene `evaluation === "voice"` (dato
  del contenido, no decisión de la vista), y su `ReplayButton` repite la **instrucción**, no
  el ítem (§6, paso 1).
- **P9 · D23 por capas.** `hideMic` (nuevo, `settings.hideMic`, por defecto `false`) lo leen
  las vistas. `speechMode` (ya existe, por defecto `"parent"`) lo lee `pickEvaluator` en
  `speech/`. Ninguno de los dos entra en `engine/`. Sin interfaz hasta el Plan 6.
- **P10 · Ajustes nuevos con `default` de Zod.** Un documento v1 guardado sin `hideMic` (o sin
  el contador nuevo) debe cargar con `recovered: false` y sin perder el acento. Sin esto,
  `migrate` repondría **todos** los ajustes por omisión.
- **P11 · `first-syllable-voice` corrige su condición.** Hoy salta con `counters.voiceOk`, que
  cuenta también las letras, así que se ganaría con la primera vocal de la Fase 1. El spec §7
  dice «primer `say-it` de sílaba en ok». Nuevo contador `syllablesVoiced`: `say-it` sobre un
  ítem `syllable`, resuelto sin `assisted`.
- **P12 · D19 también en el modelo del tercer rung.** La tinta despreciable no cierra el
  modelo de `trace`. Lo decide el motor (`acceptsModelTrace`), no la vista. Tras un trazo
  ignorado se borra la tinta **sin** tocar la pista que se está mostrando (ni `attemptKey` ni
  `feedback`), sin sonido de fallo y sin guardar.
- **P13 · Trampa 4 sin regla de Biome.** El test U8 de `features/boundaries.test.ts` ya
  prohíbe `@/engine/<módulo>` desde `features/` y `components/`, y `unitMasteryRatio` no está
  en el barril (D3). La conversión es un test que fije que el barril no lo exporta. Coste si
  fuera un error: nada se rompe, solo se pierde el aviso en el editor.
- **P14 · Idioma del objetivo.** `mx` → `es-MX`; `do` y `neutro` → `es-US` (el spec solo
  admite `es-MX`, `es-ES` y `es-US`). No afecta a `parent`.
- **P15 · La boca (D21) sale en la presentación de `say-it` y en su pista 1.** Las
  presentaciones de `listen-tap` y `trace` no cambian: `minor (deferred)` al Plan 6.

## Global Constraints

- Principios del spec §2 sin excepción: sonido y no nombre; sin castigos ni mensajes
  negativos; fallo neutro (`feedback:retry`) de menos de 2 s; pistas de menos a más;
  presentación antes de evaluar; voz permisiva.
- Sin texto para el niño: instrucciones con audio e icono. Solo hay texto visible en el
  objetivo (letra, sílaba o palabra) y en la interfaz del adulto («Lo dijo bien», «Otra vez»,
  «Lo repitió» y los `aria-label`).
- Objetivos táctiles ≥ 72 px, separados ≥ 16 px; el micrófono, ≥ 96 px. Sin scroll dentro de
  un ejercicio en 360 × 640 vertical ni en 1024 × 768 apaisado.
- Todo audio pasa por el `AudioPlayer`. **La interfaz no depende de que un `play` suene ni
  acabe**: toda espera de audio va con `Promise.race` contra un tope (`HINT_AUDIO_MAX_MS
  2500`), por la deuda 2.
- Animaciones solo con `motion-safe:`. Con movimiento reducido, estado quieto equivalente, y
  los temporizadores acaban igual.
- Colores y fuentes solo con los tokens de `src/app/globals.css`. Un token nuevo va allí y en
  `docs/diseno-visual.md`.
- `features/` y `components/` importan solo los barriles `@/engine`, `@/store`, `@/audio` y
  `@/speech` (este último nuevo, Tarea 3). `engine/` y `content/` no importan React, ni el
  DOM, ni `@/speech`.
- El audio del micrófono nunca se guarda ni sale del dispositivo.
- TDD; `pnpm test`, `pnpm typecheck` y `pnpm lint` en verde antes de cada commit (salida
  recortada: `pnpm test 2>&1 | tail -15`); Conventional Commits en español con el porqué.
- Next 16: antes de tocar código de Next, lee la guía en `node_modules/next/dist/docs/`.

## Review Focus

1. **La voz del dispositivo cuenta como la del niño** (la instrucción o el modelo aún suenan
   cuando se abre el micrófono). Se espera `audio.stop()` al pulsar y la cuenta atrás antes de
   capturar. → Tarea 4, V5.
2. **No hay micrófono**: API ausente (http en la LAN, jsdom), permiso denegado, sin
   dispositivo. Se espera que aparezcan los botones del adulto, sin error ni pantalla muerta.
   → Tarea 3, S10-S12; Tarea 4, V9.
3. **El niño no habla nunca.** Se espera que, tras 2 silencios, el adulto tenga los botones,
   también en el modelo del tercer rung. → Tarea 4, V7 y V11.
4. **La respuesta se filtra**: el audio del ítem al montar o el botón de repetir en una
   evaluación de voz. Se espera que no suene el objetivo antes de la pista 2. → Tarea 5, Y3 y
   Y4; Tarea 6, W3.
5. **El micrófono se queda abierto** al desmontar a mitad de escucha o al salir el adulto. Se
   espera que las pistas se paren siempre. → Tarea 3, S8; Tarea 4, V10.

---

## Estructura de archivos

```
vitest.config.ts                          modificar: *.test.tsx en jsdom (T1)
src/test-env.test.tsx                     crear: centinela de entorno (T1)
src/engine/
  trace.ts (+ test)                       modificar: tinta despreciable (T2)
  session.ts (+ test)                     modificar: submitSpeech, acceptsModelTrace, guardas (T2)
  answers.ts (+ test)                     modificar: firstSyllableAudioKey (T2)
  apply.ts, types.ts, rewards.ts (+ tests) modificar: syllablesVoiced (T2)
  evaluable.test.ts                       crear: invariante de la trampa 9 (T2)
  index.ts (+ barrel test)                modificar: exportar lo nuevo (T2, T4)
src/store/schema.ts, app-store.ts (+ tests) modificar: hideMic, contador, answerSpeech (T2)
src/speech/                               crear: types, vad, capture, evaluators, target, index (T3)
src/features/boundaries.test.ts           modificar: @/speech es barril (T3)
src/features/app-context.tsx              modificar: useSpeech (T3)
src/content/mouths.ts (+ test)            crear: forma de boca por fonema (T4)
src/components/Mouth.tsx, MicButton.tsx (+ tests)        crear (T4)
src/features/session/voice/VoiceTurn.tsx (+ test)        crear (T4)
src/features/session/voice/hint-effects.ts (+ test)      crear (T5)
src/features/session/say-it/Presentation.tsx, Evaluation.tsx (+ tests)  crear (T5)
src/features/session/registry.ts (+ test)  modificar: speech?, say-it (T5), read-word (T6)
src/features/session/SessionScreen.tsx (+ test)  modificar: voz (T5), trazo ignorado (T6)
src/features/session/read-word/Presentation.tsx, Evaluation.tsx (+ tests) crear (T6)
src/features/session/trace/Evaluation.tsx (+ test)  modificar: D19 en la vista (T6)
src/features/dev/PlantillasDev.tsx (+ test)  modificar: say-it y read-word (T6)
src/features/Voice.integration.test.tsx   crear (T7)
src/features/session/build/SessionFlow.test.tsx  modificar: deuda 4 (T7)
README.md, docs/archivo-trampas-y-deuda.md  modificar: poda (T7)
```

Los ficheros de `features/` que no se nombran aquí no se tocan. Rutas que el implementador
confirma al empezar: dónde se monta `AppProviders` (búscalo con `grep -rn AppProviders src`).

---

## Tarea 1: Configuración — `*.test.tsx` en jsdom y la trampa 4

**Riesgo:** configuración. Revisión de cumplimiento, sin mutación.

**Files:** `vitest.config.ts`; crear `src/test-env.test.tsx`; el test del barril de
`@/engine` (búscalo con `grep -rln "unitMasteryRatio" src`; si no existe, crea
`src/engine/barrel.test.ts`).

**Contrato:**
- Los `*.test.tsx` corren en `jsdom` y los `*.test.ts` en `node`, **sin** comentario
  `// @vitest-environment`. Antes de elegir el mecanismo, mira la documentación de la versión
  instalada (context7 o `node_modules/vitest`): `environmentMatchGlobs` probablemente ya no
  existe, y lo previsible es `test.projects` con `extends: true`. El comentario por fichero
  sigue mandando sobre el proyecto. Los comentarios que ya existen se quedan: quitarlos es
  ruido sin valor.
- `coverage.include` gana `src/speech/**`.
- Trampa 4 (P13): un test que falla si el barril `@/engine` exporta `unitMasteryRatio`.

**Casos de test:**
- C1 `src/test-env.test.tsx`, sin comentario de entorno: `typeof document !== "undefined"`.
- C2 un `.test.ts` cualquiera sigue en `node` (`typeof document === "undefined"`), dentro del
  mismo `test-env` como `src/test-env-node.test.ts`.
- C3 `"unitMasteryRatio" in (await import("@/engine"))` es `false`.

**Aceptación:** **el número de tests es idéntico antes y después, más los centinelas** (hoy
900 + 1 omitido; anota las dos cifras en el reporte). Una configuración de proyectos que se
deja ficheros por el camino también sale en verde. `pnpm typecheck` y `pnpm lint` en verde.

- [ ] Anotar el recuento actual (`pnpm test 2>&1 | tail -5`)
- [ ] Escribir C1-C3 y ver fallar C1
- [ ] Cambiar `vitest.config.ts`
- [ ] Puertas en verde con el recuento esperado
- [ ] Commit: `test(config): los .test.tsx corren en jsdom sin comentario, para que ningún test de interfaz nazca en node`

---

## Tarea 2: Motor y store de voz, y D19 en el motor

**Riesgo:** lógica del motor, `store/` y el contrato motor ↔ interfaz. Revisión completa con
**mutaciones** (lista al final de la tarea).

**Files:** `src/engine/{trace,session,answers,apply,types,rewards,index}.ts` y sus tests;
crear `src/engine/evaluable.test.ts`; `src/store/{schema,app-store}.ts` y sus tests.

**Interfaces que produce** (las usan las tareas 4-7):

```ts
// engine/trace.ts
export const ACCIDENTAL_INK_RATIO = 0.1;
/** Tinta total (suma de longitudes de las polilíneas, solo puntos finitos) menor que
 *  ACCIDENTAL_INK_RATIO × longitud total de los trazos del glifo. Estricto: `<`. */
export function isNegligibleTrace(glyph: Glyph, strokes: readonly TraceStroke[]): boolean;

// engine/session.ts
export type AttemptFeedback = {
  hint: HintStep | null;
  resolution: ExerciseResolution | null;
  /** Solo en `trace` con tinta despreciable (D19): no contó como intento. */
  ignored?: true;
};
export type SpokenVerdict = "ok" | "retry";
export function submitSpeech(input: {
  content: CurriculumIndex; run: SessionRun; verdict: SpokenVerdict; now: string;
}): { run: SessionRun; feedback: AttemptFeedback };
/** ¿Cierra este trazo el modelo del tercer rung? `false` si la tinta es despreciable.
 *  Lanza si el ejercicio en curso no es una evaluación `trace` resuelta como `assisted`. */
export function acceptsModelTrace(
  content: CurriculumIndex, run: SessionRun, strokes: readonly TraceStroke[],
): boolean;

// engine/answers.ts
/** Audio de la primera sílaba de una palabra (pista 2 de read-word): el `audioKey` del ítem
 *  `syllable:<s>` si existe; si la sílaba es una vocal sola, el de `phoneme:<v>`. Lanza si
 *  el ítem no es `word` o si no hay ninguno de los dos. */
export function firstSyllableAudioKey(content: CurriculumIndex, item: Item): string;

// engine/types.ts: Counters gana `syllablesVoiced: number` (y emptyProgressState lo pone a 0)

// store
settings.hideMic: boolean            // z.boolean().default(false); emptyPersistedState: false
counters.syllablesVoiced             // z.number().int().min(0).default(0)
AppState.answerSpeech(verdict: SpokenVerdict): Promise<AttemptFeedback>
```

El barril `@/engine` añade `submitSpeech`, `SpokenVerdict`, `acceptsModelTrace` y
`firstSyllableAudioKey`. `isNegligibleTrace` **no** entra en el barril.

**Reglas:**
- `submitSpeech` hace las mismas guardas que `submitTrace` (sesión acabada, no evaluación, ya
  resuelto, ítem desconocido) y además lanza si `templates[templateId].evaluation !==
  "voice"`. Traduce `ok` → `"correct"` y `retry` → `"wrong"`, y delega en `resolveAttempt`.
- `submitAnswer` lanza para las plantillas con `evaluation` `"trace"` o `"voice"`, y el
  mensaje nombra la función correcta. Actualiza el comentario de `checkAnswer` y el de
  `expectedAnswer` (ya no están «sin evaluador propio»).
- `submitTrace` con tinta despreciable devuelve **la misma corrida** (mismo intento, sin
  pista) y `{ hint: null, resolution: null, ignored: true }`.
- `bumpCounters` recibe el `kind` del ítem. `syllablesVoiced += 1` solo con `say-it` sobre un
  ítem `syllable` y `status !== "assisted"`. `first-syllable-voice` pasa a
  `counters.syllablesVoiced >= 1` (P11).
- `answerSpeech` sigue el patrón de `answerTrace`: guarda solo si hay resolución.

**Casos de test:**
- M1 `isNegligibleTrace`: sin trazos → `true`; un solo punto → `true`; la letra A trazada con
  sus propios trazos → `false`; tinta justo en el umbral → `false` (es estricto); puntos `NaN`
  ignorados (un trazo de NaN más un punto → `true`).
- M2 `submitTrace` con un punto: corrida idéntica (`toBe` o igualdad profunda del `attempt`),
  `ignored: true`, sin pista y sin resolución; el intento siguiente con un trazo bueno da
  `mastery-credit` (el ignorado no gastó el primer intento).
- M3 `acceptsModelTrace`: tras 3 fallos, un punto → `false` y un trazo completo → `true`;
  lanza en `say-it` y en un `trace` todavía sin resolver.
- M4 `submitSpeech`: `ok` al 1.º intento → `mastery-credit`; `retry` → pista `reduce`
  (`show-mouth+replay-instruction` en `say-it`, `split-syllables+replay-instruction` en
  `read-word`); `retry` ×3 → `assisted` con `play-full+accept-any-speech`; `ok` tras un
  `retry` → `correct-with-hint`.
- M5 `submitSpeech` lanza en `trace`, en `listen-tap`, en una presentación y con el ejercicio
  ya resuelto. `submitAnswer` lanza en `say-it` y en `read-word`, con un mensaje que contiene
  `submitSpeech`.
- M6 contadores: `say-it` + `syllable:ma` + `mastery-credit` → `syllablesVoiced 1` y
  `voiceOk 1`; `say-it` + `letter:a` → `syllablesVoiced 0` y `voiceOk 1`; `say-it` + sílaba
  `assisted` → los dos a 0; `read-word` correcto → `wordsRead 1` y `syllablesVoiced 0`.
- M7 recompensa: con `voiceOk 3` y `syllablesVoiced 0`, `first-syllable-voice` no se gana;
  con `syllablesVoiced 1`, sí.
- M8 `firstSyllableAudioKey`: `word:mapa` → el `audioKey` de `syllable:ma`; `word:ala` → el
  de `phoneme:a`; `word:mamá` → el de `syllable:ma`; `letter:a` → lanza.
- M9 store: `answerSpeech("ok")` guarda y devuelve `mastery-credit`; `answerSpeech("retry")`
  en el 1.º intento no guarda; `answerTrace` con un punto no guarda y devuelve `ignored`.
- M10 schema: un documento v1 válido **sin** `hideMic` y sin `syllablesVoiced` carga con
  `recovered: false`, `hideMic: false`, `syllablesVoiced: 0` y el acento que traía (`mx`).
- M11 `evaluable.test.ts` (trampa 9): para cada unidad de las fases 0-2, cada plantilla
  declarada y cada ítem de `introduces` cuyo `kind` acepte la plantilla:
  - `evaluation === "voice"`: una corrida con ese único ejercicio y `submitSpeech("ok")` da
    `mastery-credit`. En `say-it`, `stretchKey(item.id)` e `item.audioKey` existen en
    `audioManifest`; en `read-word`, `firstSyllableAudioKey` e `item.audioKey` también.
  - `evaluation === "trace"`: `glyphFor(item, "upper")` no lanza.
  - El resto (toque, arrastre) ya lo cubre M11 del Plan 3: cítalo en un comentario con su
    ruta y no lo dupliques.
  - Metacomprobación: el recorrido visita al menos una pareja de voz y una de trazo (si no, un
    bucle vacío saldría en verde).
  Para montar la corrida de un solo ejercicio, sigue el patrón de los tests de
  `submitTrace` en `session.test.ts`.

**Mutaciones que debe probar el revisor** (cada una tiene que hacer fallar algún test):
`retry` → `"correct"` en `submitSpeech`; `<` → `<=` en `isNegligibleTrace`; quitar la guarda
de voz en `submitAnswer`; `syllablesVoiced` sin mirar el `kind`; `answerSpeech` sin guardar al
resolver; `.default(false)` quitado de `hideMic`.

- [ ] Tests M1-M11 escritos; verlos fallar
- [ ] Implementar motor, store y barril
- [ ] Puertas en verde
- [ ] Commit: `feat(engine): submitSpeech y tinta despreciable en trace, para que la voz tenga camino propio y un toque sin querer no gaste pista`

---

## Tarea 3: El módulo `speech/`

**Riesgo:** lógica nueva (VAD, elección de evaluador) y privacidad. Revisión completa con
mutaciones.

**Files:** crear `src/speech/{types,vad,capture,evaluators,target,index}.ts` con sus tests
(`.test.ts`, en node: las dependencias del navegador se inyectan);
`src/features/boundaries.test.ts`; `src/features/app-context.tsx`.

**Interfaces:**

```ts
// types.ts — la del spec §6, literal
export type SpeechLang = "es-MX" | "es-ES" | "es-US";
export type SpeechTarget = { text: string; phonemes: string[]; lang: SpeechLang };
export type SpeechVerdict = { verdict: "ok" | "retry" | "unsure"; confidence: number; detail?: unknown };
export interface SpeechEvaluator {
  readonly id: "parent" | "browser" | "azure";
  available(): Promise<boolean>;
  evaluate(input: { audio?: Blob; target: SpeechTarget }): Promise<SpeechVerdict>;
}

// vad.ts — puro
export const VAD = { SPEECH_RMS: 0.02, MIN_SPEECH_MS: 120, SILENCE_AFTER_MS: 600, MAX_MS: 3000 } as const;
export type VadState = { startedAt: number; prevT: number; runMs: number; lastVoiceAt: number | null; heard: boolean; done: boolean };
export function createVad(t0: number): VadState;
export function stepVad(state: VadState, frame: { rms: number; t: number }): VadState;
export function rms(samples: Float32Array): number;

// capture.ts
export type ListenResult =
  | { kind: "heard" } | { kind: "silence" } | { kind: "aborted" }
  | { kind: "unavailable"; reason: "no-api" | "denied" | "error" };
export type Listener = { listen(opts?: { onLevel?(rms: number): void; signal?: AbortSignal }): Promise<ListenResult> };
export function createMicListener(deps?: {
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
  createAudioContext?: () => AudioContext;
  now?: () => number;
  frameMs?: number;                      // por defecto 50
}): Listener;
export function createScriptedListener(results: ListenResult[]): Listener; // tests y /dev

// evaluators.ts
export function createParentEvaluator(): SpeechEvaluator;   // available → true; evaluate → { verdict: "unsure", confidence: 0 }
export function pickEvaluator(evaluators: readonly SpeechEvaluator[], mode: "auto" | "parent"): Promise<SpeechEvaluator>;

// target.ts
export function speechTarget(item: Item, accent: "do" | "mx" | "neutro"): SpeechTarget; // P14

// app-context.tsx
export type SpeechDeps = { listener: Listener; evaluators: readonly SpeechEvaluator[] };
// AppProviders gana `speech?: SpeechDeps` (por omisión: createMicListener() y [createParentEvaluator()], creados una vez)
export function useSpeech(): SpeechDeps;
```

**Reglas:**
- `stepVad`: un frame con `rms >= SPEECH_RMS` suma `t - prevT` a `runMs`. Uno por debajo pone
  `runMs` a 0 **si todavía no hay `heard`** (así un clic no cuenta). `heard` pasa a `true`
  cuando `runMs >= MIN_SPEECH_MS`, y ya no vuelve atrás. `lastVoiceAt` se actualiza con cada
  frame de voz. `done` si `heard` y `t - lastVoiceAt >= SILENCE_AFTER_MS`, o si `t - startedAt
  >= MAX_MS`.
- `createMicListener`: sin `getUserMedia` (ni inyectado ni en `navigator.mediaDevices`) →
  `unavailable/no-api`; `NotAllowedError` o `SecurityError` → `denied`; cualquier otro error →
  `error`. Constraints `{ audio: { echoCancellation: true, noiseSuppression: true,
  autoGainControl: true } }` (P7). Cada `frameMs`: `getFloatTimeDomainData` → `rms` →
  `onLevel` → `stepVad`. Con `done`: `heard` o `silence`. Con `signal` abortado: `aborted`.
  **En un bloque `finally`**, siempre: parar el intervalo, `track.stop()` en todas las pistas
  y `ctx.close()` (P6).
- `pickEvaluator`: con `"parent"` devuelve el `parent` (y lanza si no está en la lista). Con
  `"auto"`, el primero disponible en el orden `azure` → `browser` → `parent`. Si
  `available()` lanza, se trata como no disponible. Si no hay ninguno, lanza.
- `boundaries.test.ts`: `speech` entra en `PRIVADAS`; `"@/speech/vad"` va a la lista de
  prohibidos y `"@/speech"` a la de permitidos.

**Casos de test:**
- S1 `rms` de ceros → 0; de una onda cuadrada ±0.5 → 0.5.
- S2 silencio 3 s (frames de 50 ms con `rms 0.001`) → `done` en `t = MAX_MS`, `heard false`.
- S3 un clic: un solo frame alto de 50 ms entre silencios → nunca `heard`.
- S4 habla de 400 ms seguida de silencio → `heard`, y `done` exactamente al pasar 600 ms
  desde el último frame de voz, no antes.
- S5 habla, pausa de 300 ms y más habla → **no** termina en la pausa: el silencio se mide
  desde el último frame de voz.
- S6 habla continua 5 s → `done` en `MAX_MS` con `heard true`.
- S7 `createMicListener` con fakes (stream con 2 pistas, analizador programable, reloj
  manual): habla → `heard`, con `onLevel` llamado en cada frame.
- S8 aborto a mitad de escucha → `aborted`, y las 2 pistas con `stop()` llamado y `close()`
  del contexto; lo mismo tras `heard` y tras `silence`.
- S9 si `getFloatTimeDomainData` lanza a mitad → `unavailable/error`, y las pistas se paran
  igualmente.
- S10 sin `getUserMedia` → `unavailable/no-api`, sin lanzar.
- S11 `getUserMedia` rechaza con `NotAllowedError` → `denied`.
- S12 rechaza con otro error → `error`.
- S13 `pickEvaluator`: `"parent"` con `[browserFalso(disponible), parent]` → `parent`;
  `"auto"` con el mismo → `browser`; `"auto"` con `browser` no disponible → `parent`;
  `available()` que lanza → se salta.
- S14 `createParentEvaluator().evaluate(...)` → `unsure`.
- S15 `speechTarget(letter:a, "mx")` → `{ text: "a", phonemes: ["a"], lang: "es-MX" }`; con
  `"do"` y con `"neutro"` → `es-US`.
- S16 `useSpeech()` sin `AppProviders` lanza; con `AppProviders` sin la prop `speech`
  devuelve los de por omisión (en `.test.tsx`).

**Mutaciones:** no reiniciar `runMs` en un frame bajo (S3 debe caer); medir el silencio desde
`startedAt` (S5); quitar el `finally` (S8/S9); ignorar `mode` en `pickEvaluator` (S13); no
aplicar `MAX_MS` (S6).

- [ ] Tests S1-S16; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(speech): VAD por energía y evaluador parent tras la interfaz del spec, para dar turno de voz sin dependencias ni guardar audio`

---

## Tarea 4: Boca, micrófono y turno de voz

**Riesgo:** interfaz con máquina de estados que protege al niño (P4, P7). Revisión completa;
mutaciones sobre `VoiceTurn`.

**Files:** crear `src/content/mouths.ts` (+ test) y exportarlo por `src/engine/index.ts`;
`src/components/Mouth.tsx`, `src/components/MicButton.tsx` y
`src/features/session/voice/VoiceTurn.tsx`, con sus `.test.tsx`.

**Interfaces:**

```ts
// content/mouths.ts (dato de presentación; el barril @/engine lo reexporta)
export type MouthShape = "open" | "spread" | "round" | "closed" | "teeth" | "tongue";
export function mouthShapesFor(item: Item): MouthShape[];  // una por fonema, en orden
// a → open; e, i → spread; o, u → round; m, p → closed; s → teeth; l → tongue

// components/Mouth.tsx — puro, decorativo (aria-hidden)
export const MOUTH_STEP_MS = 450;
export function Mouth(props: { shapes: readonly MouthShape[]; playing: boolean; onDone?(): void }): JSX.Element;
// playing: recorre las formas una vez, un paso cada MOUTH_STEP_MS, y llama onDone.
// Con movimiento reducido: la última forma quieta, y onDone al mismo tiempo total.

// components/MicButton.tsx — puro
export function MicButton(props: {
  state: "idle" | "countdown" | "listening"; level: number; disabled: boolean; onPress(): void;
}): JSX.Element;
// ≥ 96 px, aria-label "Micrófono". countdown: 3 puntos que se encienden. listening: onda con
// `level` (motion-safe; con movimiento reducido, un anillo fijo).

// features/session/voice/VoiceTurn.tsx
export const COUNTDOWN_MS = 900;
export const MAX_SILENT_TURNS = 2;
export function VoiceTurn(props: {
  mode: "attempt" | "model";
  target: SpeechTarget;
  disabled: boolean;         // locked o audio de pista sonando
  hideMic: boolean;
  onVerdict(verdict: SpokenVerdict): void;   // solo en "attempt"
  onModelDone(): void;                       // solo en "model"
}): JSX.Element;
```

**Máquina de `VoiceTurn`:** `idle` → (pulsar) `audio.stop()` → `countdown` (`COUNTDOWN_MS`)
→ `listening` (`listener.listen`, pasa `level` a `MicButton`) → según el resultado:
- `heard` y `mode "attempt"`: `pickEvaluator(evaluators, settings.speechMode)` → `evaluate`.
  Con `ok`, `onVerdict("ok")`. Con `retry` o `unsure` (P1), los botones del adulto: «Lo dijo
  bien» → `onVerdict("ok")`, «Otra vez» → `onVerdict("retry")`. Si el evaluador lanza, los
  mismos botones.
- `heard` y `mode "model"`: `onModelDone()` sin botones (§5: basta que hable).
- `silence`: suena `feedback:no-speech` y vuelve a `idle`; al silencio número
  `MAX_SILENT_TURNS` de este montaje, botones del adulto (en `"model"`, un solo botón: «Lo
  repitió» → `onModelDone`).
- `unavailable` (cualquier razón) o `hideMic`: botones del adulto desde el principio, sin
  micrófono.
- `aborted`: nada.
Al desmontar, aborta la escucha en curso (`AbortController`). Un segundo toque durante
`countdown` o `listening` no abre otra escucha. Con `disabled`, ni el micrófono ni los botones
responden. `speechMode` sale de `useApp((s) => s.doc.settings.speechMode)`, y `listener` y
`evaluators` de `useSpeech()`.

**Casos de test** (`createScriptedListener`, reproductor falso, temporizadores falsos):
- V1 `mouthShapesFor`: `letter:a` → `["open"]`; `syllable:ma` → `["closed","open"]`;
  invariante: todo fonema de los ítems `letter`, `syllable` y `word` de las fases 1 y 2 tiene
  forma.
- V2 `Mouth` recorre las formas y llama `onDone` una vez a `shapes.length × MOUTH_STEP_MS`;
  con movimiento reducido muestra la última y llama `onDone` al mismo tiempo.
- V3 `MicButton`: `onPress` no se llama con `disabled`; tamaño y `aria-label`.
- V4 `heard` + `parent` → aparecen «Lo dijo bien» y «Otra vez»; cada uno llama `onVerdict`
  con `"ok"` o `"retry"`, una sola vez aunque se toque dos veces.
- V5 al pulsar el micrófono se llama `audio.stop()` **antes** que `listen`, y `listen` no se
  llama hasta pasado `COUNTDOWN_MS`.
- V6 evaluador falso que devuelve `ok` con `speechMode "auto"` → `onVerdict("ok")` sin
  botones; con `speechMode "parent"` y el mismo evaluador en la lista → botones.
- V7 `silence` → suena `feedback:no-speech` y vuelve el micrófono, sin `onVerdict`; al
  segundo `silence`, los botones.
- V8 `hideMic` → los botones desde el principio, sin micrófono y sin llamar a `listen`.
- V9 `unavailable/denied` → los botones, sin error visible.
- V10 desmontar durante `listening` → la señal queda abortada (el listener falso lo registra).
- V11 `mode "model"`: `heard` → `onModelDone` sin botones; `hideMic` → solo «Lo repitió»;
  dos `silence` → «Lo repitió».
- V12 `disabled` → ni el micrófono ni los botones llaman a nada.

**Mutaciones:** `listen` antes de `audio.stop()` (V5); `MAX_SILENT_TURNS` sin efecto (V7);
`ok` del evaluador ignorando `speechMode` (V6); no abortar al desmontar (V10); botones sin
protección de doble toque (V4).

- [ ] Tests V1-V12; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(voz): turno de voz con cuenta atrás, VAD y botones del adulto, para que el niño nunca quede atrapado sin micrófono`

---

## Tarea 5: `say-it` de punta a punta — desbloquea la Fase 1

**Riesgo:** contrato motor ↔ interfaz y pedagogía (P8). Revisión completa con mutaciones.

**Files:** crear `src/features/session/voice/hint-effects.ts` y
`src/features/session/say-it/{Presentation,Evaluation}.tsx`, con sus tests; modificar
`src/features/session/registry.ts` y `SessionScreen.tsx` (+ tests).

**Interfaces:**

```ts
// voice/hint-effects.ts — puro, como traceEffect
export type VoiceEffect =
  | { kind: "none" }
  | { kind: "mouth"; request: AudioRequest }   // say-it rung 1: boca + instrucción
  | { kind: "split"; request: AudioRequest }   // read-word rung 1: sílabas separadas + instrucción
  | { kind: "sound"; request: AudioRequest }   // rung 2
  | { kind: "model"; request: AudioRequest };  // rung 3: objetivo entero y turno en modo "model"
export function voiceEffect(input: { action: string; item: Item; content: CurriculumIndex }): VoiceEffect;
// show-mouth+replay-instruction → mouth, instruction:say-it
// split-syllables+replay-instruction → split, instruction:read-word
// lengthen-first-phoneme → sound, stretchKey(item.id)
// play-first-syllable → sound, firstSyllableAudioKey(content, item)
// play-full+accept-any-speech → model, item.audioKey
// acción desconocida → none

// registry.ts
export type SpeechInput = { onVerdict(verdict: SpokenVerdict): void };
// EvaluationProps gana `speech?: SpeechInput` (opcional, como `trace?`)
```

**Vistas:**
- `say-it/Presentation`: el objetivo grande (letra: par `display.upper` + `display.lower`,
  §2; sílaba: `item.text`), `Mouth` con `mouthShapesFor(item)` sonando a la vez que
  `item.audioKey`, y `ReplayButton` para repetir las dos cosas. El cierre sigue el patrón de
  `listen-tap/Presentation.tsx`: léelo y cópialo.
- `say-it/Evaluation`: el objetivo, **sin audio del objetivo** (P8). `ReplayButton` repite
  `instruction:say-it`. `VoiceTurn` con `speechTarget(item, accent)` y `hideMic` de
  `useApp`. Aplica `voiceEffect` de cada `feedback` nuevo: `mouth` enseña la boca animada y
  reproduce la instrucción; `sound` reproduce el sonido alargado; `model` reproduce el
  objetivo y pone `VoiceTurn` en `mode "model"`. Mientras suena el audio de una pista,
  `VoiceTurn` va `disabled`, con tope `HINT_AUDIO_MAX_MS`. Lanza si falta `props.speech`.
- `SessionScreen.ExerciseView`: no reproduce `item.audioKey` al montar si
  `templates[exercise.templateId].evaluation === "voice"`. Con esa misma condición pasa
  `speech: { onVerdict: v => resolver(() => answerSpeech(v)) }` con las mismas guardas
  `busy` que `onAnswer`. El modelo termina con `onModelDone`, como en las demás plantillas.
- `registry`: se registra `say-it` y se añade a `IMPLEMENTED_TEMPLATES`. Con eso, las
  unidades de la Fase 1 dejan de estar atenuadas.

**Casos de test:**
- Y1 `voiceEffect`: las 5 acciones, más una desconocida → `none`. `play-first-syllable` de
  `word:ala` → la clave de `phoneme:a`.
- Y2 `say-it/Presentation`: con `letter:a` pinta «A» y «a», reproduce `item.audioKey`, monta
  `Mouth` con `["open"]` y cierra con `onDone`.
- Y3 `say-it/Evaluation`: al montar no se reproduce `item.audioKey`, y `ReplayButton`
  reproduce `instruction:say-it`.
- Y4 `SessionScreen` con un ejercicio `say-it`: al montar suena la instrucción y **no** el
  ítem; con un ejercicio `listen-tap`, siguen sonando los dos (la regla vieja no se rompe).
- Y5 fallo 1 (`Otra vez`) → `feedback:retry`, y después la boca con la instrucción; fallo 2
  → `stretch:<id>`; fallo 3 → el objetivo entero y `VoiceTurn` en modo modelo; `heard` →
  siguiente ejercicio.
- Y6 «Lo dijo bien» al primer intento → celebración y `next`, con el progreso con
  `mastery-credit` en el store.
- Y7 navegador sin voz (`play` que nunca resuelve): tras `HINT_AUDIO_MAX_MS` el micrófono se
  habilita igual.
- Y8 `registry`: `isSessionPlayable` es `true` con la primera unidad de la Fase 1 activa y
  todas las de la Fase 0 hechas (progreso construido a mano).

**Mutaciones:** reproducir el ítem al montar en voz (Y4); `lengthen-first-phoneme` que
reproduce `item.audioKey` (Y1/Y5); sin tope de audio en la pista (Y7); `speech` sin la guarda
`busy` (doble «Lo dijo bien» → dos llamadas al store).

- [ ] Tests Y1-Y8; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(say-it): el niño dice la letra o la sílaba y el adulto confirma, lo que desbloquea la Fase 1`

---

## Tarea 6: `read-word`, D19 en la vista y `/dev/plantillas`

**Riesgo:** interfaz y contrato (D19). Revisión completa; mutaciones sobre D19 y la imagen
oculta.

**Files:** crear `src/features/session/read-word/{Presentation,Evaluation}.tsx` (+ tests);
modificar `registry.ts`, `SessionScreen.tsx`, `trace/Evaluation.tsx`,
`src/features/dev/PlantillasDev.tsx` y sus tests.

**Contrato:**
- `read-word/Presentation`: la palabra con sus sílabas separadas (`item.syllables`, «ma·pa»),
  su imagen visible (`Picture` con `item.imageKey`) y `item.audioKey`. Cierra como las demás.
- `read-word/Evaluation`: la palabra en minúscula tal cual (`mamá` con tilde) y la **imagen
  oculta** (tarjeta tapada, con `aria-label` que no la nombre). `ReplayButton` repite
  `instruction:read-word`. `VoiceTurn` como en `say-it`. `split` separa las sílabas y
  reproduce la instrucción; `sound` reproduce la primera sílaba; `model` reproduce la palabra
  y pasa a modo modelo. La imagen se revela cuando `feedback.resolution !== null`, tanto en
  la celebración como en el modelo.
- `registry`: `read-word` registrada y en `IMPLEMENTED_TEMPLATES`. Con eso la Fase 2 queda
  jugable (D22).
- D19 en la vista (P12): `TraceInput` gana `clearKey: number` y `acceptsModel(strokes):
  boolean`. `ExerciseView` calcula `acceptsModel` con `acceptsModelTrace(curriculum, run,
  strokes)`. En `resolver`, un `feedback.ignored` no suena, no toca `feedback` ni
  `attemptKey`, desbloquea (`locked false`, `busy false`) e incrementa `clearKey`.
  `trace/Evaluation` borra la tinta, `strokesRef` y `submitted` cuando cambia `clearKey`,
  **sin** tocar `pulseStart` ni `animation`. En modo modelo, un intento cerrado con
  `acceptsModel(strokes) === false` borra la tinta y sigue esperando.
- `PlantillasDev`: `say-it` y `read-word` en el selector, con un `createScriptedListener`
  elegible (oído / silencio / sin micrófono) para ver los tres caminos sin micrófono real.

**Casos de test:**
- W1 `read-word/Presentation` con `word:mapa`: «ma·pa», la imagen visible y la palabra
  sonando.
- W2 `read-word/Evaluation`: la imagen no está en el DOM accesible hasta la resolución; tras
  «Lo dijo bien», sí.
- W3 al montar no suena `item.audioKey`, y `ReplayButton` → `instruction:read-word`.
- W4 fallo 1 → las sílabas separadas; fallo 2 → la clave de `firstSyllableAudioKey`; fallo 3
  → la palabra entera, modo modelo y la imagen revelada.
- W5 `isSessionPlayable` es `true` con `phase2:m` activa (las fases 0 y 1 hechas), y todas
  las plantillas que declaran las unidades de las fases 0-2 están en `IMPLEMENTED_TEMPLATES`
  y en `templateViews`.
- W6 D19: en `SessionScreen` con un `trace`, un punto → sin `feedback:retry`, sin guardar, la
  tinta se borra, y la pista que se mostraba (el pulso del inicio tras un fallo) **sigue**; el
  trazo siguiente cuenta como el mismo intento.
- W7 D19 en el modelo: tras 3 fallos, un punto no llama `onModelDone` y borra la tinta; un
  trazo completo, sí.
- W8 `PlantillasDev` monta `say-it` y `read-word` con el listener de guion.

**Mutaciones:** el trazo ignorado incrementa `attemptKey` (W6 debe caer: se pierde la pista);
revelar la imagen al montar (W2); `acceptsModel` sin usar (W7).

- [ ] Tests W1-W8; verlos fallar
- [ ] Implementar
- [ ] Puertas en verde
- [ ] Commit: `feat(read-word): leer la palabra y descubrir la imagen, que desbloquea la Fase 2; un toque sin querer en trace ya no gasta pista`

---

## Tarea 7: Cierre — integración, deuda 4, README y prueba manual

**Riesgo:** tests y documentación. Revisión de cumplimiento; sin mutación, salvo que el
revisor vea una aserción vacía.

**Files:** crear `src/features/Voice.integration.test.tsx`; modificar
`src/features/session/build/SessionFlow.test.tsx`, `README.md` y
`docs/archivo-trampas-y-deuda.md`; registro del plan.

**Contrato:**
- `Voice.integration.test.tsx`, con vistas, motor y store reales y un currículo de prueba
  con una unidad que declara solo `say-it` (`letter:a` y `syllable:ma`) y otra solo
  `read-word` (sigue el patrón de `Trace.integration.test.tsx`):
  - I1 «Lo dijo bien» al 1.º intento sube de caja, `voiceOk` y `syllablesVoiced` (en la
    sílaba).
  - I2 «Otra vez» ×3 → modelo → `heard` → avanza; `assisted` en el progreso; `voiceOk` no
    sube.
  - I3 `hideMic` en el documento → solo botones en toda la sesión.
  - I4 dos silencios → botones; no se registra ningún intento hasta pulsar uno.
  - I5 `read-word` correcto → `wordsRead 1` y la imagen revelada.
  - I6 al acabar, el fin de sesión cuenta bien los ejercicios.
- I7 con el currículo **real**: una sesión planificada con la primera unidad de la Fase 1
  activa y otra con `phase2:m` activa, y todas sus plantillas tienen vista.
- Deuda 4: `build/SessionFlow.test.tsx` deja de inyectar la corrida. Llega a `build` por la
  vía normal (store real, progreso con la Fase 2 activa y semilla fija que planifique un
  `build`). Las aserciones de ese test no se debilitan.
- README: estado, «Lo que ya está hecho: Plan 5», D19-D23 en la tabla, y en «Cómo
  ejecutarlo» cómo probar la voz desde un móvil. **`getUserMedia` exige contexto seguro**: el
  `http://<ip-lan>` de hoy no lo es. Averigua en `node_modules/next/dist/docs/` la opción
  HTTPS de `next dev` que trae la versión instalada (no la supongas) y documéntala junto a
  `DEV_ORIGINS`.
- Poda (regla de `CLAUDE.md`): las trampas 4, 8 y 9 salen del README (convertidas en test,
  configuración e invariante, T1-T2) y pasan al archivo con el commit que las cerró. La deuda
  4, igual. Tope: 8 trampas y 10 deudas.
- Registro: la lista de la **prueba manual del autor** (antes del PR), sección nueva:
  1. iPad/iPhone con Safari: el permiso de micrófono se pide una vez; el indicador de
     grabación se apaga entre turnos.
  2. La instrucción y el modelo se siguen oyendo bien después de abrir el micrófono (iOS
     cambia la sesión de audio).
  3. La voz de un niño a la distancia normal da «oído» (P5), y el televisor de fondo no
     bloquea nada.
  4. Denegar el permiso → botones del adulto, sin pantalla muerta.
  5. La boca se entiende como boca (D21, placeholder).
  6. Un toque accidental en `trace` desaparece sin gastar pista (D19).

- [ ] I1-I7 y deuda 4
- [ ] README y poda
- [ ] Puertas en verde, y `pnpm build`
- [ ] Commit: `docs(plan): cierra el Plan 5 con la voz jugable y la poda de trampas`

Tras la Tarea 7: la revisión final de rama con `model: "opus"`, la prueba manual del autor y
el PR.
