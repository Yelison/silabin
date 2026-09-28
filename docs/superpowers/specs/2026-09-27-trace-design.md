# Silabín: diseño de `trace` (Plan 4)

Fecha: 2026-09-27. Estado: aprobado por el autor en conversación; pendiente de plan de
implementación. Complementa el spec general
[`2026-09-18-silabin-design.md`](2026-09-18-silabin-design.md) (§4 plantillas, §5 pistas,
§9 orientación, §10 pruebas), que sigue siendo la autoridad en todo lo que este documento no
concreta.

## 1. Objetivo y alcance

Construir la plantilla `trace`: el niño repasa con el dedo una letra mayúscula sobre una
guía que se desvanece en 3 niveles, y el motor decide si el trazo vale con una puntuación
por tolerancia. Es el componente más difícil del proyecto (spec §11, riesgo 6).

**Dentro:** los datos de trazo de las 9 mayúsculas de v1 (A E I O U M L S P), la
puntuación, el nivel de guía, la entrada propia del trazo en el motor, el lienzo, las vistas
de presentación y evaluación con sus 3 pistas, `trace` en `/dev/plantillas` y la corrección
de R29.

**Fuera:** las minúsculas (Plan 6, con el panel de padres), el desbloqueo de la Fase 1
(Plan 5, con `say-it`) y el test Playwright de una sesión de Fase 1 (Plan 5).

**Resultado visible:** en `/dev/plantillas` se trazan las 9 letras en los 3 niveles de guía,
con sus pistas. En el mapa la Fase 1 sigue atenuada hasta el Plan 5.

## 2. Decisiones

Tomadas con el autor el 2026-09-27. Siguen la numeración de `README.md` (D1-D11).

| # | Decisión |
|---|---|
| D12 | **Se evalúa solo la forma.** Hay acierto si el dedo cubre cada trazo de la letra dentro de una tolerancia generosa y casi toda la tinta cae cerca de la letra. El orden y la dirección de los trazos se enseñan con la guía, pero no se exigen: mejor un falso acierto que frustrar |
| D13 | **El nivel de guía lo decide el motor según la caja Leitner del ítem** (caja 0 → nivel 1, caja 1 → nivel 2, cajas 2-3 → nivel 3). El nivel 3 conserva un carril muy tenue: sin guía habría que reconocer la forma en cualquier posición y tamaño |
| D14 | **La Fase 1 se desbloquea en el Plan 5**, cuando exista `say-it`. El Plan 4 no mete en el planificador ninguna lógica provisional para saltarse plantillas, y ninguna vocal se domina sin haberla dicho |
| D15 | **R29: con 2 opciones, la pista 1 no atenúa**, solo repite el audio. El nivel fácil sigue con 2 opciones |
| D16 | **Solo mayúsculas en el Plan 4.** El contrato ya lleva el caso (`"upper" \| "lower"`); el Plan 6 añade las 9 minúsculas y el interruptor `lowercaseTracing` del panel de padres |
| D17 | **El trazo entra al motor por `submitTrace`**, junto a `submitAnswer`, y el motor lo puntúa. La interfaz pinta con SVG y eventos `pointer`, sin `<canvas>` |
| D18 | **Los marcadores de inicio superpuestos** (A, E, M, P) se separan desplazándolos a lo largo de la dirección de su propio trazo; la pista 2 pasa de un punto simple a una **flecha de dirección animada** (mismo mecanismo `offsetPath`/`offset-rotate:auto`), que también se reproduce una vez tras la presentación completa de la letra (encadenada, no simultánea) |

## 3. Motor y contenido

### Datos de las letras (`src/content/glyphs.ts`)

```ts
export type GlyphPoint = { x: number; y: number };
/** Caja de altura 1, `y` hacia abajo; `width` varía por letra (M es más ancha que I). */
export type Glyph = { width: number; strokes: GlyphPoint[][] };
export type LetterCase = "upper" | "lower";
export function glyphFor(item: Item, letterCase: LetterCase): Glyph;
```

- Los trazos son polilíneas escritas con dos ayudantes (`line`, `arc`); las curvas de O y S
  salen del ayudante con densidad suficiente.
- Siguen el orden escolar habitual, que la guía enseña con números y flechas (A: diagonal
  izquierda desde el vértice, diagonal derecha desde el vértice, travesaño).
- `glyphFor` lanza si la letra no tiene trazo, y siempre con `"lower"` hasta el Plan 6.
- **Invariante** en `pnpm test`, en la línea de M11: toda letra que pueda sacar una unidad que
  declara `trace` tiene trazo en mayúscula; ningún punto se sale de la caja
  (`0 ≤ x ≤ width`, `0 ≤ y ≤ 1`); ningún trazo tiene menos de 2 puntos.

### Puntuación (`src/engine/trace.ts`, puro)

```ts
export type TraceStroke = GlyphPoint[];
export type TraceScore = { correct: boolean; coverage: number[]; precision: number };
export function scoreTrace(glyph: Glyph, strokes: readonly TraceStroke[]): TraceScore;
```

- **Cobertura por trazo:** cada trazo de la letra se remuestrea a paso fijo; un punto está
  cubierto si queda a menos de `TOLERANCE` de algún **segmento** de la tinta del niño. Medir
  al segmento y no al punto hace que un dedo rápido, que deja pocos puntos, también cuente.
- **Precisión:** fracción de la tinta remuestreada a menos de `TOLERANCE` de algún segmento
  de la letra. Un garabato que tapa la caja cubre todo pero no pasa por aquí.
- **Acierto** si todos los trazos tienen `coverage ≥ MIN_COVERAGE` y `precision ≥
  MIN_PRECISION`. Sin tinta, `correct` es `false`.
- Constantes de partida: `TOLERANCE = 0.15` (en alturas de letra), `MIN_COVERAGE = 0.75`,
  `MIN_PRECISION = 0.8`. Se ajustan en la prueba manual en un dispositivo real y el ajuste
  queda en el registro del plan.

### Nivel de guía

```ts
export type GuideLevel = 1 | 2 | 3;
export function guideLevel(box: Box, hintsShown: 0 | 1 | 2 | 3): GuideLevel;
```

| Nivel | Se ve |
|---|---|
| 1 | Carril, línea punteada, puntos de inicio numerados y flechas de dirección |
| 2 | Carril tenue y puntos de inicio |
| 3 | Carril muy tenue y el punto de inicio del primer trazo |

Base según la caja: 0 → 1, 1 → 2, 2 y 3 → 3. Con las pistas 1 y 2 el nivel baja uno (mínimo
1): es la pista 1 del spec, «reaparece la guía del nivel anterior». Con la pista 3 vuelve a 1,
porque el modelo se repasa con la guía completa.

### Contrato de sesión (`src/engine/session.ts`)

```ts
export function submitTrace(input: {
	content: CurriculumIndex;
	run: SessionRun;
	strokes: readonly TraceStroke[];
	now: string;
}): { run: SessionRun; feedback: AttemptFeedback };

export type TraceGuide = { glyph: Glyph; level: GuideLevel };
export function traceGuide(content: CurriculumIndex, run: SessionRun): TraceGuide;
```

- `submitTrace` puntúa con `scoreTrace` y comparte con `submitAnswer` un `resolveAttempt`
  interno (mismas pistas, misma resolución, mismo `applyResolution`, que ya suma
  `counters.traces`).
- `submitAnswer` lanza ante un ejercicio `trace` con un mensaje que apunta a `submitTrace`;
  `submitTrace` lanza ante cualquier otra plantilla, ante una presentación y ante un
  ejercicio ya resuelto.
- `traceGuide` lanza si el ejercicio en curso no es `trace`. Usa la caja de
  `run.progress` y `run.attempt.hintsShown`.
- El caso es siempre `"upper"`; `lowercaseTracing` se ignora hasta el Plan 6.
- `expectedAnswer` sigue devolviendo `null` para `trace`: la **trampa 9 queda cerrada para
  `trace`** porque ningún camino llega a `checkAnswer` con un trazo, y sigue abierta para
  `say-it` y `read-word`.
- El barril `@/engine` reexporta `submitTrace`, `traceGuide`, `glyphFor`, `TraceGuide`,
  `TraceStroke`, `GuideLevel`, `Glyph`, `GlyphPoint` y `LetterCase`. La presentación usa
  `glyphFor`, porque no hay intento ni guía que calcular. También reexporta `scoreTrace`,
  `TraceScore` y `guideLevel`, que solo necesita `/dev/plantillas` (§4) para construir la
  guía y el marcador sin una sesión en curso: `features/` no puede importar módulos internos
  del motor (test U8), y un test de fronteras nuevo comprueba que ningún fichero fuera de
  `src/features/dev/` usa `scoreTrace` ni `guideLevel`, para que ninguna vista decida por su
  cuenta si un trazo vale ni qué guía toca.
- El store gana `answerTrace(strokes)` junto a `answer(value)`, con el mismo guardado tras
  cada paso.

## 4. Interfaz

### Lienzo (`src/components/TraceCanvas.tsx`)

- SVG con el `viewBox` de la caja de la letra más un margen, escalado al lado corto del área
  disponible (spec §9).
- Capas de abajo arriba: carril, línea punteada, números de inicio, flechas, tinta del niño
  (trazo grueso, puntas redondas) y el punto animado de las pistas.
- Entrada: `pointerdown/move/up/cancel` con `touch-action: none` y `setPointerCapture`. Solo
  cuenta el puntero primario, para que la palma o un segundo dedo no pinten. Las coordenadas
  se pasan a la caja de la letra con `getBoundingClientRect` (simulado en `jsdom`, como en
  `build`).
- No puntúa ni decide: recibe `glyph`, `level`, `animation: "none" | "dot" | "full"` y
  `disabled`, y avisa con `onStrokeEnd`.

### Evaluación (`src/features/session/trace/Evaluation.tsx`)

- **Cierre del intento:** al levantar el dedo empieza a contar `TRACE_IDLE_MS = 1500`; si el
  niño vuelve a tocar, se cancela. Al vencer, la vista manda todos los trazos del intento con
  `onTrace(strokes)`. Levantar el dedo entre trazos o para recolocarse no es un fallo. La
  constante se ajusta en la prueba manual.
- `EvaluationProps` gana un único campo opcional `trace?: { guide: TraceGuide;
  onTrace(strokes): void }`, que `SessionScreen` solo pasa en los ejercicios `trace` (con
  `guide` sacado de `traceGuide`). Opcional para no tocar las 8 vistas de toque ni sus
  tests; la vista de trazo lanza si no lo recibe. El `resolver` de `SessionScreen` acepta
  tanto `answer` como `answerTrace`. El sonido neutro de fallo y el `attemptKey` que limpia
  la tinta no cambian.
- Tras un acierto, la vista conserva la guía que tenía mientras dura la celebración: el
  motor ya ha subido la caja y `traceGuide` daría un nivel más tenue.

### Pistas (`src/features/session/trace/hint-effects.ts`)

Dato puro, como `choiceEffect`: convierte la `action` que ordena el motor en un efecto.

| Pista | Efecto |
|---|---|
| 1 `restore-previous-guide-level` | El nivel baja solo (viene de `traceGuide`); además pulsa el punto de inicio 1, lo único visible si la base ya era 1 |
| 2 `animate-dot-along-stroke+play-phoneme` | Una flecha recorre cada trazo en orden mientras suena `item.audioKey`; el lienzo no acepta tinta hasta que acaba |
| 3 `animate-full-stroke+await-retrace` | La letra se dibuja sola trazo a trazo y queda en nivel 1; el niño la repasa y cualquier intento cerrado llama a `onModelDone()` **sin puntuar**, porque el rung 3 garantiza el acierto |

### Presentación (`src/features/session/trace/Presentation.tsx`)

El planificador puede presentar una letra con `trace` (elige la plantilla de la presentación
entre las de la unidad), así que esta vista hace falta. Muestra el par **A a** (spec §2), con
la mayúscula grande; suena el fonema; la mayúscula se dibuja sola completa
(`animation="full"`) y, encadenada al terminar, la misma flecha de dirección animada de la
pista 2 (D18) recorre los trazos una vez más, en nivel 1; el niño puede repasarla sin
evaluación durante toda la secuencia y pasa con el `BigButton` «Siguiente», como en las demás
presentaciones.

### Registro y `/dev/plantillas`

- `trace` entra en `IMPLEMENTED_TEMPLATES`. La Fase 1 sigue atenuada porque `say-it` falta;
  un test lo fija.
- `/dev/plantillas` gana `trace` con selector de letra y de nivel, y un marcador de
  `coverage` y `precision` (solo en desarrollo) para afinar las constantes en el dispositivo.

## 5. R29

En `choiceEffect` (`src/features/session/choice/hint-effects.ts`), las acciones
`dim-one-distractor+replay` y `dim-one-distractor+replay-phoneme` devuelven
`{ kind: "replay" }` con el mismo audio que habrían repetido cuando el ejercicio tiene 2
opciones. Con 3, siguen atenuando un distractor (nunca la correcta).

## 6. Pruebas

- **Geometría** con letras sintéticas: la letra perfecta pasa; un trazo tembloroso dentro de
  la tolerancia pasa; dibujarla sin uno de sus trazos falla; un garabato que tapa la caja
  falla; un dedo rápido con 2 puntos por trazo pasa; sin tinta falla.
- **Nivel de guía:** la tabla completa de caja × pistas.
- **Prueba cruzada** con las 9 letras reales: cada una, dibujada con sus propios trazos (y
  con un temblor de ±0.08), pasa; dibujada sobre la caja de cualquier otra, falla, salvo una
  lista explícita de pares confundibles que se permite que pasen. Un prototipo al escribir el
  plan (2026-09-27) dio con las constantes de partida 5 pares: E sobre S, E sobre P, S sobre
  E, O sobre U y U sobre O; con tolerancia 0.10 solo quedaba U sobre O. Es el precio de D12
  (mejor un falso acierto que frustrar): la guía está a la vista y el niño repasa esa letra,
  no dibuja otra. Si aparece un par nuevo, el implementador lo reporta en vez de ajustar hasta
  que pase, y se decide con el autor.
- **Sesión:** `submitTrace` con acierto al primer intento, fallo con pista, tres fallos hasta
  `assisted`, `counters.traces`, y las guardas de `submitAnswer`, `submitTrace` y
  `traceGuide`.
- **Vista:** Testing Library con eventos `pointer`, `getBoundingClientRect` simulado y relojes
  falsos para `TRACE_IDLE_MS`; puntero no primario ignorado; el modelo no puntúa.
- **Integración:** vistas, motor y store reales sobre un **currículo de prueba** con una
  unidad que solo declara `trace` (la Fase 1 real sacaría `say-it`): presentación, acierto al
  primer intento y tres fallos que recorren las 3 pistas hasta el modelo.
- **Manual:** el autor, en un dispositivo táctil real, con `/dev/plantillas`; las constantes
  se ajustan con lo que salga.
- **Playwright** (spec §10, «sesión de Fase 1 con eventos táctiles en `trace`»): se aplaza al
  Plan 5, cuando la Fase 1 sea jugable.
